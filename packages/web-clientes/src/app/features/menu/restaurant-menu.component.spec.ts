import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { RestaurantMenuComponent } from './restaurant-menu.component'
import { DishService } from '../../core/services/dish.service'
import { RestaurantService } from '../../core/services/restaurant.service'
import { TableSelectionStore } from '../../core/store/table-selection.store'
import { Table } from '../../core/models/table.model'

const table: Table = {
  id: 'table-5',
  restaurantId: 'rest-1',
  number: 5,
  description: 'Terraza',
  capacity: 4,
  status: 'ocupada',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

describe('RestaurantMenuComponent', () => {
  let el: HTMLElement

  beforeEach(async () => {
    sessionStorage.clear()

    await TestBed.configureTestingModule({
      imports: [RestaurantMenuComponent],
      providers: [
        provideRouter([]),
        { provide: DishService, useValue: { getByRestaurant: () => of([]) } },
        { provide: RestaurantService, useValue: { getById: () => of({ id: 'rest-1', name: 'La Tasca' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'rest-1' }) } } }
      ]
    }).compileComponents()

    TestBed.inject(TableSelectionStore).select('rest-1', table)

    const fixture = TestBed.createComponent(RestaurantMenuComponent)
    el = fixture.nativeElement
    fixture.detectChanges()
  })

  afterEach(() => sessionStorage.clear())

  it('shows the number of the selected table in the header', () => {
    expect(el.querySelector('.page-header')?.textContent).toContain('Mesa 5')
  })

  it('links to the table selection page to change the table', () => {
    const link = Array.from(el.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Cambiar mesa')

    expect(link?.getAttribute('href')).toBe('/restaurants/rest-1/table')
  })
})
