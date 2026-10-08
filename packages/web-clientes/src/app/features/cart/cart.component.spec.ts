import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { Router, provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { CartComponent } from './cart.component'
import { OrderService } from '../../core/services/order.service'
import { CartStore, Dish } from '../../core/store/cart.store'
import { TableSelectionStore } from '../../core/store/table-selection.store'
import { Table } from '../../core/models/table.model'

const dish: Dish = {
  id: 'dish-1',
  name: 'Croquetas',
  description: null,
  price: 8,
  category: 'Entrantes',
  available: true,
  restaurantId: 'rest-1',
  ingredients: []
}

const table: Table = {
  id: 'table-5',
  restaurantId: 'rest-1',
  number: 5,
  description: null,
  capacity: 4,
  status: 'ocupada',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>
  let el: HTMLElement
  let orderService: { createOrder: ReturnType<typeof vi.fn> }

  const chooseTableLink = () =>
    Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find(a => a.textContent?.trim() === 'Elegir mesa')

  const failWith = (status: number, error: string) =>
    orderService.createOrder.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status, error: { error, message: '' } }))
    )

  const confirmButton = () =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === 'Confirmar pedido')!

  beforeEach(async () => {
    sessionStorage.clear()
    orderService = { createOrder: vi.fn().mockReturnValue(of({ id: 'order-1' })) }

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: orderService }
      ]
    }).compileComponents()

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
    TestBed.inject(CartStore).addItem(dish, 2)
    TestBed.inject(TableSelectionStore).select('rest-1', table)

    fixture = TestBed.createComponent(CartComponent)
    el = fixture.nativeElement
    fixture.detectChanges()
  })

  afterEach(() => sessionStorage.clear())

  it('sends the order with the selected table of the restaurant', () => {
    confirmButton().click()

    expect(orderService.createOrder).toHaveBeenCalledWith('rest-1', 'table-5', [
      { dishId: 'dish-1', quantity: 2, notes: null }
    ])
  })

  it.each([
    [404, 'TableNotFoundError'],
    [409, 'TableNotAvailableError']
  ])('asks to choose another table when the api rejects the table (%i %s)', (status, error) => {
    failWith(status, error)

    confirmButton().click()
    fixture.detectChanges()

    expect(el.textContent).toContain('Tu mesa ya no está disponible. Elige otra mesa para continuar.')
    expect(chooseTableLink()?.getAttribute('href')).toBe('/restaurants/rest-1/table')
    expect(TestBed.inject(TableSelectionStore).tableFor('rest-1')).toBeNull()
    expect(TestBed.inject(CartStore).items().length).toBe(1)
  })

  it('keeps the generic error for other failures', () => {
    failWith(400, 'Some items are not available')

    confirmButton().click()
    fixture.detectChanges()

    expect(el.textContent).toContain('Error al confirmar el pedido. Inténtalo de nuevo.')
    expect(TestBed.inject(TableSelectionStore).tableFor('rest-1')).toEqual(table)
  })

  it('asks to choose a table when there is none for the restaurant', () => {
    TestBed.inject(TableSelectionStore).clear()
    fixture.detectChanges()

    expect(el.textContent).toContain('Elige una mesa antes de confirmar el pedido.')
    expect(chooseTableLink()?.getAttribute('href')).toBe('/restaurants/rest-1/table')
    expect(confirmButton().disabled).toBe(true)
  })
})
