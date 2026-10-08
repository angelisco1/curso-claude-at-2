import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { TableStore } from './table.store'
import { TableService } from '../services/table.service'
import type { Table } from '../models/table.model'

const buildTable = (overrides: Partial<Table> = {}): Table => ({
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 1,
  description: null,
  capacity: 4,
  status: 'libre',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
  ...overrides
})

describe('TableStore', () => {
  let store: TableStore
  let service: {
    getAll: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    service = { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
    TestBed.configureTestingModule({
      providers: [{ provide: TableService, useValue: service }]
    })
    store = TestBed.inject(TableStore)
  })

  it('loadByRestaurant sets the tables and clears loading', async () => {
    const tables = [buildTable(), buildTable({ id: 'table-2', number: 2 })]
    service.getAll.mockReturnValue(of(tables))

    await store.loadByRestaurant('rest-1')

    expect(service.getAll).toHaveBeenCalledWith('rest-1')
    expect(store.tables()).toEqual(tables)
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('loadByRestaurant sets the error when the request fails', async () => {
    service.getAll.mockReturnValue(throwError(() => new Error('boom')))

    await store.loadByRestaurant('rest-1')

    expect(store.error()).toBe('No se pudieron cargar las mesas.')
    expect(store.loading()).toBe(false)
  })

  it('create appends the created table', async () => {
    service.getAll.mockReturnValue(of([buildTable()]))
    await store.loadByRestaurant('rest-1')
    const created = buildTable({ id: 'table-2', number: 5 })
    service.create.mockReturnValue(of(created))

    await store.create('rest-1', { number: 5, capacity: 4 })

    expect(service.create).toHaveBeenCalledWith('rest-1', { number: 5, capacity: 4 })
    expect(store.tables().map(t => t.id)).toEqual(['table-1', 'table-2'])
  })

  it('update replaces the updated table', async () => {
    service.getAll.mockReturnValue(of([buildTable()]))
    await store.loadByRestaurant('rest-1')
    const updated = buildTable({ capacity: 6, status: 'reservada' })
    service.update.mockReturnValue(of(updated))
    const dto = { number: 1, capacity: 6, status: 'reservada' as const }

    await store.update('rest-1', 'table-1', dto)

    expect(service.update).toHaveBeenCalledWith('rest-1', 'table-1', dto)
    expect(store.tables()).toEqual([updated])
  })

  it('delete removes the table from the list', async () => {
    service.getAll.mockReturnValue(of([buildTable(), buildTable({ id: 'table-2' })]))
    await store.loadByRestaurant('rest-1')
    service.delete.mockReturnValue(of(undefined))

    await store.delete('rest-1', 'table-1')

    expect(service.delete).toHaveBeenCalledWith('rest-1', 'table-1')
    expect(store.tables().map(t => t.id)).toEqual(['table-2'])
  })

  it('delete propagates the error and keeps the table', async () => {
    service.getAll.mockReturnValue(of([buildTable()]))
    await store.loadByRestaurant('rest-1')
    service.delete.mockReturnValue(throwError(() => ({ status: 409 })))

    await expect(store.delete('rest-1', 'table-1')).rejects.toEqual({ status: 409 })
    expect(store.tables()).toHaveLength(1)
  })
})
