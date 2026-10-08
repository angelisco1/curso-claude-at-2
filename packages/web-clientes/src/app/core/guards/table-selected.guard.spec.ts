import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, convertToParamMap, provideRouter } from '@angular/router'
import { tableSelectedGuard } from './table-selected.guard'
import { TableSelectionStore } from '../store/table-selection.store'
import { Table } from '../models/table.model'

const table: Table = {
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 5,
  description: null,
  capacity: 4,
  status: 'ocupada',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

describe('tableSelectedGuard', () => {
  const runGuard = (restaurantId: string) => {
    const route = { paramMap: convertToParamMap({ id: restaurantId }) } as ActivatedRouteSnapshot
    return TestBed.runInInjectionContext(() => tableSelectedGuard(route, {} as RouterStateSnapshot))
  }

  const serialize = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree)

  beforeEach(() => {
    sessionStorage.clear()
    TestBed.configureTestingModule({ providers: [provideRouter([])] })
  })

  afterEach(() => sessionStorage.clear())

  it('lets the user in when a table is selected for that restaurant', () => {
    TestBed.inject(TableSelectionStore).select('rest-1', table)

    expect(runGuard('rest-1')).toBe(true)
  })

  it('redirects to the table selection when no table is selected', () => {
    const result = runGuard('rest-1')

    expect(result).toBeInstanceOf(UrlTree)
    expect(serialize(result)).toBe('/restaurants/rest-1/table')
  })

  it('redirects to the table selection when the table belongs to another restaurant', () => {
    TestBed.inject(TableSelectionStore).select('rest-1', table)

    const result = runGuard('rest-2')

    expect(result).toBeInstanceOf(UrlTree)
    expect(serialize(result)).toBe('/restaurants/rest-2/table')
  })
})
