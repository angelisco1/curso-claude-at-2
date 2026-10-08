import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { API_URL } from '@resttek/web-shared'
import { TableService } from './table.service'
import { Table } from '../models/table.model'

const table: Table = {
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 5,
  description: 'Terraza',
  capacity: 4,
  status: 'libre',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' }
      ]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('gets the available tables for the given number of people', () => {
    let result: Table[] | undefined
    service.getAvailable('rest-1', 3).subscribe(tables => (result = tables))

    const req = http.expectOne(r => r.url === '/api/v1/restaurants/rest-1/tables/available')
    expect(req.request.method).toBe('GET')
    expect(req.request.params.get('people')).toBe('3')
    req.flush([table])

    expect(result).toEqual([table])
  })

  it('occupies a table sending the number of people', () => {
    let result: Table | undefined
    service.occupy('rest-1', 'table-1', 3).subscribe(t => (result = t))

    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-1/occupy')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ people: 3 })
    req.flush({ ...table, status: 'ocupada' })

    expect(result?.status).toBe('ocupada')
  })
})
