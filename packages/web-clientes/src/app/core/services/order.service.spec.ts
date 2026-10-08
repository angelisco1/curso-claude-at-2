import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { API_URL } from '@resttek/web-shared'
import { OrderService } from './order.service'

describe('OrderService', () => {
  let service: OrderService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' }
      ]
    })
    service = TestBed.inject(OrderService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('creates an order sending the selected table id', () => {
    const items = [{ dishId: 'dish-1', quantity: 2, notes: null }]

    service.createOrder('rest-1', 'table-5', items).subscribe()

    const req = http.expectOne('/api/v1/orders')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ restaurantId: 'rest-1', tableId: 'table-5', items })
    req.flush({})
  })
})
