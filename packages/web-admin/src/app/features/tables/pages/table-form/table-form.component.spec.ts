import { TestBed } from '@angular/core/testing'
import { importProvidersFrom } from '@angular/core'
import { provideRouter, Router } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { ChevronLeft, LucideAngularModule } from 'lucide-angular'
import { of } from 'rxjs'
import { TableFormComponent } from './table-form.component'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import type { Table } from '../../models/table.model'

const table: Table = {
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 5,
  description: 'Terraza',
  capacity: 4,
  status: 'reservada',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

describe('TableFormComponent', () => {
  let store: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  let service: { getAll: ReturnType<typeof vi.fn> }
  let navigate: ReturnType<typeof vi.spyOn>

  const render = async (url: string) => {
    const harness = await RouterTestingHarness.create()
    await harness.navigateByUrl(url, TableFormComponent)
    await harness.fixture.whenStable()
    harness.detectChanges()
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
    return harness
  }

  const element = (harness: RouterTestingHarness) => harness.routeNativeElement!

  const typeInto = (harness: RouterTestingHarness, selector: string, value: string) => {
    const input = element(harness).querySelector<HTMLInputElement | HTMLSelectElement>(selector)!
    input.value = value
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'))
  }

  const submit = async (harness: RouterTestingHarness) => {
    element(harness).querySelector('form')!.dispatchEvent(new Event('submit'))
    await harness.fixture.whenStable()
    harness.detectChanges()
  }

  beforeEach(() => {
    store = {
      create: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined)
    }
    service = { getAll: vi.fn().mockReturnValue(of([table])) }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'restaurants/:restaurantId/tables',
            children: [
              { path: 'new', component: TableFormComponent },
              { path: ':id/edit', component: TableFormComponent }
            ]
          }
        ]),
        { provide: TableStore, useValue: store },
        { provide: TableService, useValue: service },
        importProvidersFrom(LucideAngularModule.pick({ ChevronLeft }))
      ]
    })
  })

  it('creates the table with the form data and navigates to the list', async () => {
    const harness = await render('/restaurants/rest-1/tables/new')
    expect(element(harness).textContent).toContain('Nueva mesa')

    typeInto(harness, '#number', '5')
    typeInto(harness, '#description', 'Terraza')
    typeInto(harness, '#capacity', '4')
    await submit(harness)

    expect(store.create).toHaveBeenCalledWith('rest-1', {
      number: 5,
      description: 'Terraza',
      capacity: 4,
      status: 'libre'
    })
    expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1', 'tables'])
  })

  it('loads the table data when editing and updates it', async () => {
    const harness = await render('/restaurants/rest-1/tables/table-1/edit')

    expect(service.getAll).toHaveBeenCalledWith('rest-1')
    expect(element(harness).textContent).toContain('Editar mesa')
    expect(element(harness).querySelector<HTMLInputElement>('#number')!.value).toBe('5')
    expect(element(harness).querySelector<HTMLInputElement>('#description')!.value).toBe('Terraza')
    expect(element(harness).querySelector<HTMLInputElement>('#capacity')!.value).toBe('4')
    expect(element(harness).querySelector<HTMLSelectElement>('#status')!.value).toBe('reservada')

    typeInto(harness, '#capacity', '6')
    typeInto(harness, '#status', 'ocupada')
    await submit(harness)

    expect(store.update).toHaveBeenCalledWith('rest-1', 'table-1', {
      number: 5,
      description: 'Terraza',
      capacity: 6,
      status: 'ocupada'
    })
    expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1', 'tables'])
  })

  it('sends a null description when it is left empty', async () => {
    const harness = await render('/restaurants/rest-1/tables/new')

    typeInto(harness, '#number', '2')
    typeInto(harness, '#capacity', '2')
    await submit(harness)

    expect(store.create).toHaveBeenCalledWith('rest-1', expect.objectContaining({ description: null }))
  })

  it('shows the api error message and stays on the form', async () => {
    store.create.mockRejectedValue({
      status: 409,
      error: { error: 'DuplicatedTableNumberError', message: 'Table number already exists in this restaurant' }
    })
    const harness = await render('/restaurants/rest-1/tables/new')

    typeInto(harness, '#number', '5')
    typeInto(harness, '#capacity', '4')
    await submit(harness)

    expect(element(harness).querySelector('.alert-error')!.textContent).toContain(
      'Table number already exists in this restaurant'
    )
    expect(navigate).not.toHaveBeenCalled()
  })
})
