import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const buildTable = (overrides: Partial<Table> = {}): Table => ({
    id: 't1',
    restaurantId: 'r1',
    number: 1,
    description: 'Terraza',
    capacity: 4,
    status: 'libre',
    occupiedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        for (const id of ['r1', 'r2', 'r3', 'r4']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', new Date().toISOString(), new Date().toISOString()]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    const NOW = '2026-01-03T00:00:00.000Z'

    describe('save and findById', () => {
        it('should save and find a table by id', async () => {
            const table = buildTable()

            await repo.save(table)

            const found = await repo.findById('t1')
            expect(found).toEqual(table)
        })

        it('should return null for a non-existent id', async () => {
            expect(await repo.findById('missing')).toBeNull()
        })

        it('should update an existing table', async () => {
            await repo.save(buildTable({
                number: 2,
                description: null,
                capacity: 6,
                status: 'reservada',
                updatedAt: '2026-01-02T00:00:00.000Z'
            }))

            const found = await repo.findById('t1')
            expect(found?.number).toBe(2)
            expect(found?.description).toBeNull()
            expect(found?.capacity).toBe(6)
            expect(found?.status).toBe('reservada')
            expect(found?.createdAt).toBe('2026-01-01T00:00:00.000Z')
            expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z')
        })
    })

    describe('findByRestaurantId', () => {
        it('should return the tables of a restaurant ordered by number', async () => {
            await repo.save(buildTable({ id: 'list-3', restaurantId: 'r2', number: 3 }))
            await repo.save(buildTable({ id: 'list-1', restaurantId: 'r2', number: 1 }))
            await repo.save(buildTable({ id: 'list-2', restaurantId: 'r2', number: 2 }))

            const results = await repo.findByRestaurantId('r2')

            expect(results.map(t => t.id)).toEqual(['list-1', 'list-2', 'list-3'])
        })

        it('should not include tables of other restaurants', async () => {
            const results = await repo.findByRestaurantId('r1')

            expect(results.every(t => t.restaurantId === 'r1')).toBe(true)
        })
    })

    describe('findByRestaurantAndNumber', () => {
        it('should find a table by restaurant and number', async () => {
            const found = await repo.findByRestaurantAndNumber('r2', 2)

            expect(found?.id).toBe('list-2')
        })

        it('should return null when the number does not exist in that restaurant', async () => {
            expect(await repo.findByRestaurantAndNumber('r2', 99)).toBeNull()
            expect(await repo.findByRestaurantAndNumber('missing', 2)).toBeNull()
        })
    })

    describe('delete', () => {
        it('should delete a table', async () => {
            await repo.save(buildTable({ id: 'to-delete', restaurantId: 'r2', number: 50 }))

            await repo.delete('to-delete')

            expect(await repo.findById('to-delete')).toBeNull()
        })
    })

    describe('findAvailable', () => {
        beforeAll(async () => {
            await repo.save(buildTable({ id: 'av-six', restaurantId: 'r3', number: 1, capacity: 6 }))
            await repo.save(buildTable({ id: 'av-four-b', restaurantId: 'r3', number: 3, capacity: 4 }))
            await repo.save(buildTable({ id: 'av-four-a', restaurantId: 'r3', number: 2, capacity: 4 }))
            await repo.save(buildTable({ id: 'av-small', restaurantId: 'r3', number: 4, capacity: 2 }))
            await repo.save(buildTable({ id: 'av-occupied', restaurantId: 'r3', number: 5, capacity: 8, status: 'ocupada' }))
            await repo.save(buildTable({ id: 'av-reserved', restaurantId: 'r3', number: 6, capacity: 8, status: 'reservada' }))
            await repo.save(buildTable({ id: 'av-other', restaurantId: 'r4', number: 1, capacity: 8 }))
        })

        it('should return free tables with enough capacity ordered by capacity and number', async () => {
            const results = await repo.findAvailable('r3', 3)

            expect(results.map(t => t.id)).toEqual(['av-four-a', 'av-four-b', 'av-six'])
        })

        it('should exclude occupied, reserved and too small tables and not mix restaurants', async () => {
            const ids = (await repo.findAvailable('r3', 1)).map(t => t.id)

            expect(ids).toContain('av-small')
            expect(ids).not.toContain('av-occupied')
            expect(ids).not.toContain('av-reserved')
            expect(ids).not.toContain('av-other')
        })

        it('should return an empty list when no table is big enough', async () => {
            expect(await repo.findAvailable('r3', 7)).toEqual([])
        })
    })

    describe('occupyIfFree', () => {
        it('should occupy a free table only once', async () => {
            await repo.save(buildTable({ id: 'occ-1', restaurantId: 'r4', number: 10 }))

            const first = await repo.occupyIfFree('occ-1', 'user-1', '2026-01-03T00:00:00.000Z')
            const second = await repo.occupyIfFree('occ-1', 'user-2', '2026-01-04T00:00:00.000Z')

            expect(first).toBe(true)
            expect(second).toBe(false)
            const found = await repo.findById('occ-1')
            expect(found?.status).toBe('ocupada')
            expect(found?.occupiedBy).toBe('user-1')
            expect(found?.updatedAt).toBe('2026-01-03T00:00:00.000Z')
        })

        it('should not occupy a reserved table', async () => {
            await repo.save(buildTable({ id: 'occ-2', restaurantId: 'r4', number: 11, status: 'reservada' }))

            expect(await repo.occupyIfFree('occ-2', 'user-1', NOW)).toBe(false)
            expect((await repo.findById('occ-2'))?.status).toBe('reservada')
        })

        it('should return false for a non-existent table', async () => {
            expect(await repo.occupyIfFree('missing', 'user-1', NOW)).toBe(false)
        })
    })

    describe('occupyIfFree releasing the previous table of the same user', () => {
        beforeAll(async () => {
            await repo.save(buildTable({ id: 'move-a', restaurantId: 'r4', number: 20 }))
            await repo.save(buildTable({ id: 'move-b', restaurantId: 'r4', number: 21 }))
            await repo.save(buildTable({ id: 'move-busy', restaurantId: 'r4', number: 22, status: 'ocupada', occupiedBy: 'someone-else' }))
            await repo.save(buildTable({ id: 'move-other-restaurant', restaurantId: 'r3', number: 20 }))
        })

        it('should free the previous table of the user in the same restaurant', async () => {
            await repo.occupyIfFree('move-a', 'mover', NOW)

            const occupied = await repo.occupyIfFree('move-b', 'mover', NOW)

            expect(occupied).toBe(true)
            const previous = await repo.findById('move-a')
            expect(previous?.status).toBe('libre')
            expect(previous?.occupiedBy).toBeNull()
            expect((await repo.findById('move-b'))?.occupiedBy).toBe('mover')
        })

        it('should keep the previous table when the new one is not free', async () => {
            const occupied = await repo.occupyIfFree('move-busy', 'mover', NOW)

            expect(occupied).toBe(false)
            const current = await repo.findById('move-b')
            expect(current?.status).toBe('ocupada')
            expect(current?.occupiedBy).toBe('mover')
            expect((await repo.findById('move-busy'))?.occupiedBy).toBe('someone-else')
        })

        it('should not free tables of the user in other restaurants', async () => {
            await repo.occupyIfFree('move-other-restaurant', 'mover', NOW)

            expect((await repo.findById('move-b'))?.status).toBe('ocupada')
            expect((await repo.findById('move-other-restaurant'))?.occupiedBy).toBe('mover')
        })
    })

    describe('save with occupiedBy', () => {
        it('should persist and clear occupiedBy', async () => {
            await repo.save(buildTable({ id: 'owner', restaurantId: 'r4', number: 30, status: 'ocupada', occupiedBy: 'user-9' }))
            expect((await repo.findById('owner'))?.occupiedBy).toBe('user-9')

            await repo.save(buildTable({ id: 'owner', restaurantId: 'r4', number: 30, status: 'libre', occupiedBy: null }))
            expect((await repo.findById('owner'))?.occupiedBy).toBeNull()
        })
    })
})
