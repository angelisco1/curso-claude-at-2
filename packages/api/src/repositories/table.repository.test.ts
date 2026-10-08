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

        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', new Date().toISOString(), new Date().toISOString()]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

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
})
