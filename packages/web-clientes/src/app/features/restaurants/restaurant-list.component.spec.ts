import { importProvidersFrom } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule, Utensils } from 'lucide-angular'
import { RestaurantListComponent } from './restaurant-list.component'
import { RestaurantService } from '../../core/services/restaurant.service'
import { Restaurant } from '../../core/models/restaurant.model'

const restaurant: Restaurant = {
  id: 'rest-1',
  name: 'La Tasca',
  address: 'Calle Mayor 1',
  email: 'tasca@example.com',
  phone: '600000000',
  ownerFirstName: 'Ana',
  ownerLastName: 'García',
  logoUrl: null,
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

describe('RestaurantListComponent', () => {
  it('links each restaurant to its table selection page', async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantListComponent],
      providers: [
        provideRouter([]),
        importProvidersFrom(LucideAngularModule.pick({ Utensils })),
        { provide: RestaurantService, useValue: { getAll: () => of([restaurant]) } }
      ]
    }).compileComponents()

    const fixture = TestBed.createComponent(RestaurantListComponent)
    fixture.detectChanges()

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.restaurant-card')
    expect(link.getAttribute('href')).toBe('/restaurants/rest-1/table')
  })
})
