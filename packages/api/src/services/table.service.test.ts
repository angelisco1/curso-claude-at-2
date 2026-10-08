import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { normalizeTableStatus } from '@models/table.model.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    InvalidTableStatusError,
    InvalidTableNumberError,
    InvalidCapacityError,
    DuplicatedTableNumberError,
    RestaurantIdRequiredError,
    TableNotFoundError,
    TableOccupiedError,
    TableNotAvailableError,
    InvalidPeopleError
} from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('should accept all valid statuses', () => {
        const validStatuses = ['libre', 'ocupada', 'reservada']
        for (const s of validStatuses) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should normalize uppercase and surrounding spaces', () => {
        expect(normalizeTableStatus('  LIBRE ')).toBe('libre')
    })

    it('should throw InvalidTableStatusError for invalid status', () => {
        expect(() => normalizeTableStatus('rota')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('rota')).toThrow('Invalid table status: rota. Must be one of: libre, ocupada, reservada')
    })

    it('should throw InvalidTableStatusError for empty status', () => {
        expect(() => normalizeTableStatus('')).toThrow(InvalidTableStatusError)
    })
})

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    const validInput = {
        restaurantId: 'r1',
        number: 5,
        description: 'Terraza',
        capacity: 4
    }

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('should create and save a free table by default', async () => {
            const result = await service.create(validInput)

            expect(result.id).toBeDefined()
            expect(result).toMatchObject({
                restaurantId: 'r1',
                number: 5,
                description: 'Terraza',
                capacity: 4,
                status: 'libre',
                occupiedBy: null
            })
            expect(result.createdAt).toBe(result.updatedAt)
            expect(await repo.findById(result.id)).toEqual(result)
        })

        it('should normalize the given status', async () => {
            const result = await service.create({ ...validInput, status: ' RESERVADA ' })

            expect(result.status).toBe('reservada')
        })

        it('should store an empty or missing description as null', async () => {
            const withoutDescription = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
            const withEmptyDescription = await service.create({ ...validInput, number: 2, description: '  ' })

            expect(withoutDescription.description).toBeNull()
            expect(withEmptyDescription.description).toBeNull()
        })

        it.each([undefined, null, '', 0, -1, 1.5, '3'])('should throw InvalidTableNumberError for number %s', async (number) => {
            await expect(service.create({ ...validInput, number: number as any }))
                .rejects.toThrow(InvalidTableNumberError)
        })

        it.each([undefined, null, '', 0, -2, 2.5, '4'])('should throw InvalidCapacityError for capacity %s', async (capacity) => {
            await expect(service.create({ ...validInput, capacity: capacity as any }))
                .rejects.toThrow(InvalidCapacityError)
        })

        it('should throw InvalidTableStatusError for an invalid status', async () => {
            await expect(service.create({ ...validInput, status: 'rota' }))
                .rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw RestaurantIdRequiredError for empty restaurantId', async () => {
            await expect(service.create({ ...validInput, restaurantId: '' }))
                .rejects.toThrow(RestaurantIdRequiredError)
        })

        it('should throw DuplicatedTableNumberError when the number exists in the restaurant', async () => {
            await service.create(validInput)

            await expect(service.create(validInput)).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should allow the same number in another restaurant', async () => {
            await service.create(validInput)

            const result = await service.create({ ...validInput, restaurantId: 'r2' })

            expect(result.restaurantId).toBe('r2')
        })
    })

    describe('getById', () => {
        it('should return the table of the restaurant', async () => {
            const created = await service.create(validInput)

            expect(await service.getById('r1', created.id)).toEqual(created)
        })

        it('should throw TableNotFoundError for a non-existent id', async () => {
            await expect(service.getById('r1', 'missing')).rejects.toThrow(TableNotFoundError)
        })

        it('should throw TableNotFoundError when the table belongs to another restaurant', async () => {
            const created = await service.create(validInput)

            await expect(service.getById('r2', created.id)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('findByRestaurantId', () => {
        it('should return only the tables of the restaurant ordered by number', async () => {
            await service.create({ ...validInput, number: 3 })
            await service.create({ ...validInput, number: 1 })
            await service.create({ ...validInput, restaurantId: 'r2', number: 2 })

            const result = await service.findByRestaurantId('r1')

            expect(result.map(t => t.number)).toEqual([1, 3])
        })
    })

    describe('update', () => {
        const updateInput = { number: 7, description: 'Interior', capacity: 6, status: 'reservada' }

        it('should update an existing table keeping id, restaurant and createdAt', async () => {
            const created = await service.create(validInput)

            const updated = await service.update('r1', created.id, updateInput)

            expect(updated).toMatchObject({
                id: created.id,
                restaurantId: 'r1',
                number: 7,
                description: 'Interior',
                capacity: 6,
                status: 'reservada',
                createdAt: created.createdAt
            })
            expect(await repo.findById(created.id)).toEqual(updated)
        })

        it('should allow keeping the same number', async () => {
            const created = await service.create(validInput)

            const updated = await service.update('r1', created.id, { ...updateInput, number: 5 })

            expect(updated.number).toBe(5)
        })

        it('should throw DuplicatedTableNumberError when another table has the number', async () => {
            const created = await service.create(validInput)
            await service.create({ ...validInput, number: 7 })

            await expect(service.update('r1', created.id, updateInput)).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should throw TableNotFoundError for a non-existent table or another restaurant', async () => {
            const created = await service.create(validInput)

            await expect(service.update('r1', 'missing', updateInput)).rejects.toThrow(TableNotFoundError)
            await expect(service.update('r2', created.id, updateInput)).rejects.toThrow(TableNotFoundError)
        })

        it('should validate number, capacity and status', async () => {
            const created = await service.create(validInput)

            await expect(service.update('r1', created.id, { ...updateInput, number: 0 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.update('r1', created.id, { ...updateInput, capacity: -1 })).rejects.toThrow(InvalidCapacityError)
            await expect(service.update('r1', created.id, { ...updateInput, status: 'rota' })).rejects.toThrow(InvalidTableStatusError)
            await expect(service.update('r1', created.id, { ...updateInput, status: undefined as any })).rejects.toThrow(InvalidTableStatusError)
        })

        it('should clear the occupant when the table is no longer occupied', async () => {
            const created = await service.create(validInput)
            await repo.occupyIfFree(created.id, 'client-1', created.updatedAt)

            const updated = await service.update('r1', created.id, { ...updateInput, status: 'libre' })

            expect(updated.occupiedBy).toBeNull()
        })

        it('should keep the occupant when the table stays occupied', async () => {
            const created = await service.create(validInput)
            await repo.occupyIfFree(created.id, 'client-1', created.updatedAt)

            const updated = await service.update('r1', created.id, { ...updateInput, status: 'ocupada' })

            expect(updated.occupiedBy).toBe('client-1')
        })
    })

    describe('delete', () => {
        it('should delete an existing table', async () => {
            const created = await service.create(validInput)

            await service.delete('r1', created.id)

            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should delete a reserved table', async () => {
            const created = await service.create({ ...validInput, status: 'reservada' })

            await service.delete('r1', created.id)

            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should throw TableNotFoundError for a non-existent table or another restaurant', async () => {
            const created = await service.create(validInput)

            await expect(service.delete('r1', 'missing')).rejects.toThrow(TableNotFoundError)
            await expect(service.delete('r2', created.id)).rejects.toThrow(TableNotFoundError)
            expect(await repo.findById(created.id)).not.toBeNull()
        })

        it('should throw TableOccupiedError for an occupied table', async () => {
            const created = await service.create({ ...validInput, status: 'ocupada' })

            await expect(service.delete('r1', created.id)).rejects.toThrow(TableOccupiedError)
            expect(await repo.findById(created.id)).not.toBeNull()
        })
    })

    describe('changeStatus', () => {
        it('should change and normalize the status keeping the rest of the data', async () => {
            const created = await service.create(validInput)

            const updated = await service.changeStatus('r1', created.id, 'RESERVADA')

            expect(updated).toMatchObject({
                id: created.id,
                number: 5,
                description: 'Terraza',
                capacity: 4,
                status: 'reservada',
                createdAt: created.createdAt
            })
            expect((await repo.findById(created.id))?.status).toBe('reservada')
        })

        it('should free an occupied table clearing its occupant', async () => {
            const created = await service.create(validInput)
            await repo.occupyIfFree(created.id, 'client-1', created.updatedAt)

            const updated = await service.changeStatus('r1', created.id, 'libre')

            expect(updated.status).toBe('libre')
            expect(updated.occupiedBy).toBeNull()
        })

        it('should throw InvalidTableStatusError for an invalid status', async () => {
            const created = await service.create(validInput)

            await expect(service.changeStatus('r1', created.id, 'rota')).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError for a non-existent table or another restaurant', async () => {
            const created = await service.create(validInput)

            await expect(service.changeStatus('r1', 'missing', 'libre')).rejects.toThrow(TableNotFoundError)
            await expect(service.changeStatus('r2', created.id, 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('findAvailable', () => {
        it('should return free tables with enough capacity ordered by capacity and number', async () => {
            await service.create({ ...validInput, number: 1, capacity: 6 })
            await service.create({ ...validInput, number: 3, capacity: 4 })
            await service.create({ ...validInput, number: 2, capacity: 4 })
            await service.create({ ...validInput, number: 4, capacity: 2 })
            await service.create({ ...validInput, number: 5, capacity: 8, status: 'ocupada' })

            const result = await service.findAvailable('r1', 3)

            expect(result.map(t => t.number)).toEqual([2, 3, 1])
        })

        it.each([undefined, null, 0, -1, 1.5, NaN, '3'])('should throw InvalidPeopleError for people %s', async (people) => {
            await expect(service.findAvailable('r1', people as any)).rejects.toThrow(InvalidPeopleError)
        })
    })

    describe('occupy', () => {
        it('should occupy a free table with enough capacity for the user', async () => {
            const created = await service.create(validInput)

            const result = await service.occupy('r1', created.id, 3, 'client-1')

            expect(result).toMatchObject({ id: created.id, status: 'ocupada', occupiedBy: 'client-1' })
            expect(await repo.findById(created.id)).toEqual(result)
        })

        it('should throw TableNotAvailableError when the capacity is not enough', async () => {
            const created = await service.create(validInput)

            await expect(service.occupy('r1', created.id, 5, 'client-1')).rejects.toThrow(TableNotAvailableError)
            expect((await repo.findById(created.id))?.status).toBe('libre')
        })

        it('should throw TableNotAvailableError when another user already occupies the table', async () => {
            const created = await service.create(validInput)
            await service.occupy('r1', created.id, 2, 'client-1')

            await expect(service.occupy('r1', created.id, 2, 'client-2')).rejects.toThrow(TableNotAvailableError)
        })

        it('should throw TableNotAvailableError for a reserved table', async () => {
            const created = await service.create({ ...validInput, status: 'reservada' })

            await expect(service.occupy('r1', created.id, 2, 'client-1')).rejects.toThrow(TableNotAvailableError)
        })

        it('should be idempotent for the user that already occupies the table', async () => {
            const created = await service.create(validInput)
            const first = await service.occupy('r1', created.id, 2, 'client-1')

            const second = await service.occupy('r1', created.id, 2, 'client-1')

            expect(second).toEqual(first)
        })

        it('should throw TableNotAvailableError when the occupant retries with more people than the capacity', async () => {
            const created = await service.create(validInput)
            await service.occupy('r1', created.id, 2, 'client-1')

            await expect(service.occupy('r1', created.id, 5, 'client-1')).rejects.toThrow(TableNotAvailableError)
            expect(await repo.findById(created.id)).toMatchObject({ status: 'ocupada', occupiedBy: 'client-1' })
        })

        it('should throw TableNotAvailableError when the conditional update loses the race', async () => {
            const created = await service.create(validInput)
            repo.occupyIfFree = async () => false

            await expect(service.occupy('r1', created.id, 2, 'client-1')).rejects.toThrow(TableNotAvailableError)
        })

        it('should free the previous table of the user in the same restaurant', async () => {
            const previous = await service.create(validInput)
            const next = await service.create({ ...validInput, number: 6 })
            await service.occupy('r1', previous.id, 2, 'client-1')

            await service.occupy('r1', next.id, 2, 'client-1')

            expect(await repo.findById(previous.id)).toMatchObject({ status: 'libre', occupiedBy: null })
        })

        it('should keep the previous table when the new one is not available', async () => {
            const previous = await service.create(validInput)
            const busy = await service.create({ ...validInput, number: 6 })
            await service.occupy('r1', busy.id, 2, 'client-2')
            await service.occupy('r1', previous.id, 2, 'client-1')

            await expect(service.occupy('r1', busy.id, 2, 'client-1')).rejects.toThrow(TableNotAvailableError)

            expect(await repo.findById(previous.id)).toMatchObject({ status: 'ocupada', occupiedBy: 'client-1' })
        })

        it('should throw InvalidPeopleError for invalid people', async () => {
            const created = await service.create(validInput)

            await expect(service.occupy('r1', created.id, 0, 'client-1')).rejects.toThrow(InvalidPeopleError)
            await expect(service.occupy('r1', created.id, '2' as any, 'client-1')).rejects.toThrow(InvalidPeopleError)
        })

        it('should throw TableNotFoundError for a non-existent table or another restaurant', async () => {
            const created = await service.create(validInput)

            await expect(service.occupy('r1', 'missing', 2, 'client-1')).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy('r2', created.id, 2, 'client-1')).rejects.toThrow(TableNotFoundError)
        })
    })
})
