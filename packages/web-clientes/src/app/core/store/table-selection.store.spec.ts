import { TestBed } from '@angular/core/testing'
import { TableSelectionStore } from './table-selection.store'
import { Table } from '../models/table.model'

const table: Table = {
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 5,
  description: 'Terraza',
  capacity: 4,
  status: 'ocupada',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

describe('TableSelectionStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    TestBed.configureTestingModule({})
  })

  afterEach(() => sessionStorage.clear())

  it('starts with no selection', () => {
    const store = TestBed.inject(TableSelectionStore)
    expect(store.selected()).toBeNull()
    expect(store.tableFor('rest-1')).toBeNull()
  })

  it('stores the selected table for a restaurant', () => {
    const store = TestBed.inject(TableSelectionStore)

    store.select('rest-1', table)

    expect(store.selected()).toEqual({ restaurantId: 'rest-1', table })
    expect(store.tableFor('rest-1')).toEqual(table)
  })

  it('restores the selection after the store is recreated', () => {
    TestBed.inject(TableSelectionStore).select('rest-1', table)

    TestBed.resetTestingModule()
    TestBed.configureTestingModule({})
    const store = TestBed.inject(TableSelectionStore)

    expect(store.tableFor('rest-1')).toEqual(table)
  })

  it('returns null for a different restaurant', () => {
    const store = TestBed.inject(TableSelectionStore)
    store.select('rest-1', table)

    expect(store.tableFor('rest-2')).toBeNull()
  })

  it('clears the selection and its persisted copy', () => {
    const store = TestBed.inject(TableSelectionStore)
    store.select('rest-1', table)

    store.clear()

    expect(store.selected()).toBeNull()
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({})
    expect(TestBed.inject(TableSelectionStore).selected()).toBeNull()
  })

  it('ignores corrupted persisted data', () => {
    sessionStorage.setItem('resttek.tableSelection', '{not json')
    const store = TestBed.inject(TableSelectionStore)
    expect(store.selected()).toBeNull()
  })
})
