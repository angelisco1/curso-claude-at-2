import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { API_URL } from '@resttek/web-shared'
import { TableService } from './table.service'
import type { CreateTableDto, Table, UpdateTableDto } from '../models/table.model'

const BASE_URL = '/api/v1/restaurants/rest-1/tables'

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

  it('getAll sends GET to the restaurant tables url', () => {
    let result: Table[] | undefined
    service.getAll('rest-1').subscribe(tables => (result = tables))

    const req = http.expectOne(BASE_URL)
    expect(req.request.method).toBe('GET')
    req.flush([table])

    expect(result).toEqual([table])
  })

  it('create sends POST with the dto', () => {
    const dto: CreateTableDto = { number: 5, description: 'Terraza', capacity: 4 }
    service.create('rest-1', dto).subscribe()

    const req = http.expectOne(BASE_URL)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(dto)
    req.flush(table)
  })

  it('update sends PUT to the table url with the dto', () => {
    const dto: UpdateTableDto = { number: 6, description: null, capacity: 2, status: 'reservada' }
    service.update('rest-1', 'table-1', dto).subscribe()

    const req = http.expectOne(`${BASE_URL}/table-1`)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual(dto)
    req.flush({ ...table, ...dto })
  })

  it('delete sends DELETE to the table url', () => {
    service.delete('rest-1', 'table-1').subscribe()

    const req = http.expectOne(`${BASE_URL}/table-1`)
    expect(req.request.method).toBe('DELETE')
    req.flush(null, { status: 204, statusText: 'No Content' })
  })
})
