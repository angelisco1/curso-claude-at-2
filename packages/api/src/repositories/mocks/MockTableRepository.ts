import type { TableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    private tables: Map<string, Table> = new Map()

    async findById(id: string): Promise<Table | null> {
        return this.tables.get(id) || null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .sort((a, b) => a.number - b.number)
    }

    async findByRestaurantAndNumber(restaurantId: string, number: number): Promise<Table | null> {
        return Array.from(this.tables.values())
            .find(t => t.restaurantId === restaurantId && t.number === number) || null
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId && t.status === 'libre' && t.capacity >= people)
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
    }

    async save(table: Table): Promise<void> {
        this.tables.set(table.id, table)
    }

    async occupyIfFree(id: string, occupiedBy: string, updatedAt: string): Promise<boolean> {
        const table = this.tables.get(id)
        if (!table || table.status !== 'libre') return false

        for (const other of this.tables.values()) {
            if (other.restaurantId === table.restaurantId && other.occupiedBy === occupiedBy && other.status === 'ocupada') {
                this.tables.set(other.id, { ...other, status: 'libre', occupiedBy: null, updatedAt })
            }
        }
        this.tables.set(id, { ...table, status: 'ocupada', occupiedBy, updatedAt })
        return true
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }
}
