import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: string
    occupiedBy: string | null
    createdAt: string
    updatedAt: string
}

const SELECT_COLUMNS = 'SELECT id, restaurant_id as restaurantId, number, description, capacity, status, occupied_by as occupiedBy, created_at as createdAt, updated_at as updatedAt FROM restaurant_tables'

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    findByRestaurantAndNumber(restaurantId: string, number: number): Promise<Table | null>
    findAvailable(restaurantId: string, people: number): Promise<Table[]>
    save(table: Table): Promise<void>
    occupyIfFree(id: string, occupiedBy: string, updatedAt: string): Promise<boolean>
    delete(id: string): Promise<void>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_COLUMNS} WHERE id = ?`, [id])
        if (!row) return null
        return this.mapToTable(row)
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(`${SELECT_COLUMNS} WHERE restaurant_id = ? ORDER BY number`, [restaurantId])
        return rows.map(row => this.mapToTable(row))
    }

    async findByRestaurantAndNumber(restaurantId: string, number: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_COLUMNS} WHERE restaurant_id = ? AND number = ?`, [restaurantId, number])
        if (!row) return null
        return this.mapToTable(row)
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_COLUMNS} WHERE restaurant_id = ? AND status = 'libre' AND capacity >= ? ORDER BY capacity, number`,
            [restaurantId, people]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async save(table: Table): Promise<void> {
        const existing = await this.findById(table.id)
        if (existing) {
            await this.db.run(
                'UPDATE restaurant_tables SET number = ?, description = ?, capacity = ?, status = ?, occupied_by = ?, updated_at = ? WHERE id = ?',
                [table.number, table.description, table.capacity, table.status, table.occupiedBy, table.updatedAt, table.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, occupied_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.occupiedBy, table.createdAt, table.updatedAt]
            )
        }
    }

    /**
     * Occupies the table only if it is free and, in the same statement, frees any other
     * table the same user occupies in that restaurant. Being a single UPDATE it is atomic:
     * if the target is not free nothing changes and the previous table is kept.
     */
    async occupyIfFree(id: string, occupiedBy: string, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            `UPDATE restaurant_tables
             SET status = CASE WHEN id = ? THEN 'ocupada' ELSE 'libre' END,
                 occupied_by = CASE WHEN id = ? THEN ? ELSE NULL END,
                 updated_at = ?
             WHERE restaurant_id = (SELECT restaurant_id FROM restaurant_tables WHERE id = ?)
               AND (id = ? OR (occupied_by = ? AND status = 'ocupada'))
               AND EXISTS (SELECT 1 FROM restaurant_tables WHERE id = ? AND status = 'libre')`,
            [id, id, occupiedBy, updatedAt, id, id, occupiedBy, id]
        )
        return result.changes > 0
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM restaurant_tables WHERE id = ?', [id])
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            occupiedBy: row.occupiedBy,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
