import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Order } from '@models/order.model.js'
import type { Table } from '@models/table.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError, TableNotAvailableError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo, new MockTableRepository())

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create with tableId', () => {
    let repo: MockOrderRepository
    let tableRepo: MockTableRepository
    let service: OrderService

    const buildTable = (overrides: Partial<Table>): Table => ({
        id: 'table-1',
        restaurantId: 'rest-1',
        number: 1,
        description: null,
        capacity: 4,
        status: 'ocupada',
        occupiedBy: 'client-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
    })

    const request = (tableId: string | null) => ({
        restaurantId: 'rest-1',
        tableId,
        clientId: 'client-1',
        items: [{ dishId: 'dish-1', quantity: 1, notes: null }]
    })

    beforeEach(() => {
        repo = new MockOrderRepository()
        tableRepo = new MockTableRepository()
        service = new OrderService(repo, tableRepo)
    })

    it('should create an order without table', async () => {
        const order = await service.create(request(null))

        expect(order.tableId).toBeNull()
        expect(repo.orders).toHaveLength(1)
    })

    it('should create an order for an occupied table of the restaurant', async () => {
        await tableRepo.save(buildTable({}))

        const order = await service.create(request('table-1'))

        expect(order.tableId).toBe('table-1')
    })

    it('should throw TableNotFoundError when the table does not exist', async () => {
        await expect(service.create(request('missing'))).rejects.toThrow(TableNotFoundError)
        expect(repo.orders).toHaveLength(0)
    })

    it('should throw TableNotFoundError when the table belongs to another restaurant', async () => {
        await tableRepo.save(buildTable({ restaurantId: 'rest-2' }))

        await expect(service.create(request('table-1'))).rejects.toThrow(TableNotFoundError)
    })

    it.each(['libre', 'reservada'] as const)('should throw TableNotAvailableError when the table is %s', async (status) => {
        await tableRepo.save(buildTable({ status, occupiedBy: null }))

        await expect(service.create(request('table-1'))).rejects.toThrow(TableNotAvailableError)
        expect(repo.orders).toHaveLength(0)
    })
})
