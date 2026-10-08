import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    RestaurantIdRequiredError,
    InvalidTableNumberError,
    InvalidCapacityError,
    DuplicatedTableNumberError,
    TableNotFoundError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: number
    description?: string | null
    capacity: number
    status?: string
}

export interface UpdateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status: string
}

const isPositiveInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value > 0

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const now = new Date().toISOString()
        const table = this.buildTable({
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status ?? 'libre',
            occupiedBy: null,
            createdAt: now,
            updatedAt: now
        })

        await this.ensureNumberIsUnique(table)
        await this.tableRepository.save(table)
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.getById(restaurantId, id)

        const updated = this.buildTable({
            id: existing.id,
            restaurantId: existing.restaurantId,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status,
            occupiedBy: existing.occupiedBy,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })

        await this.ensureNumberIsUnique(updated)
        await this.tableRepository.save(updated)
        return updated
    }

    async changeStatus(restaurantId: string, id: string, status: string): Promise<Table> {
        const existing = await this.getById(restaurantId, id)

        const updated = this.buildTable({
            ...existing,
            status,
            updatedAt: new Date().toISOString()
        })

        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const existing = await this.getById(restaurantId, id)
        if (existing.status === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(id)
    }

    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    private async ensureNumberIsUnique(table: Table): Promise<void> {
        const sameNumber = await this.tableRepository.findByRestaurantAndNumber(table.restaurantId, table.number)
        if (sameNumber && sameNumber.id !== table.id) {
            throw new DuplicatedTableNumberError()
        }
    }

    private buildTable(props: {
        id: string
        restaurantId: string
        number: unknown
        description: string | null | undefined
        capacity: unknown
        status: string
        occupiedBy: string | null
        createdAt: string
        updatedAt: string
    }): Table {
        if (!props.restaurantId || props.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }
        if (!isPositiveInteger(props.number)) {
            throw new InvalidTableNumberError()
        }
        if (!isPositiveInteger(props.capacity)) {
            throw new InvalidCapacityError()
        }

        const status = normalizeTableStatus(props.status)
        const description = typeof props.description === 'string' ? props.description.trim() : ''

        return {
            id: props.id,
            restaurantId: props.restaurantId,
            number: props.number,
            description: description === '' ? null : description,
            capacity: props.capacity,
            status,
            occupiedBy: status === 'ocupada' ? props.occupiedBy : null,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        }
    }
}
