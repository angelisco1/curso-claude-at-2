import { TestBed } from '@angular/core/testing'
import { importProvidersFrom, signal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { Armchair, Edit, LucideAngularModule, Plus, Trash2 } from 'lucide-angular'
import { TableListComponent } from './table-list.component'
import { TableStore } from '../../store/table.store'
import type { Table } from '../../models/table.model'

const buildTable = (overrides: Partial<Table> = {}): Table => ({
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 1,
  description: 'Terraza',
  capacity: 4,
  status: 'libre',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
  ...overrides
})

describe('TableListComponent', () => {
  let store: {
    tables: ReturnType<typeof signal<Table[]>>
    loading: ReturnType<typeof signal<boolean>>
    error: ReturnType<typeof signal<string | null>>
    loadByRestaurant: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }

  const render = async () => {
    const harness = await RouterTestingHarness.create()
    await harness.navigateByUrl('/restaurants/rest-1/tables', TableListComponent)
    harness.detectChanges()
    return harness
  }

  beforeEach(() => {
    store = {
      tables: signal<Table[]>([]),
      loading: signal(false),
      error: signal<string | null>(null),
      loadByRestaurant: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'restaurants/:restaurantId/tables',
            children: [{ path: '', component: TableListComponent }]
          }
        ]),
        { provide: TableStore, useValue: store },
        importProvidersFrom(LucideAngularModule.pick({ Armchair, Edit, Plus, Trash2 }))
      ]
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('loads the tables of the restaurant from the route', async () => {
    await render()

    expect(store.loadByRestaurant).toHaveBeenCalledWith('rest-1')
  })

  it('renders one row per table with its data and status label', async () => {
    store.tables.set([
      buildTable(),
      buildTable({ id: 'table-2', number: 2, description: null, capacity: 6, status: 'ocupada' }),
      buildTable({ id: 'table-3', number: 3, capacity: 2, status: 'reservada' })
    ])

    const harness = await render()
    const rows = harness.routeNativeElement!.querySelectorAll('tbody tr')

    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toContain('1')
    expect(rows[0].textContent).toContain('Terraza')
    expect(rows[0].textContent).toContain('Libre')
    expect(rows[1].textContent).toContain('6')
    expect(rows[1].textContent).toContain('Ocupada')
    expect(rows[2].textContent).toContain('Reservada')
  })

  it('shows the empty message when there are no tables', async () => {
    const harness = await render()

    expect(harness.routeNativeElement!.textContent).toContain('Todavía no hay mesas.')
    expect(harness.routeNativeElement!.querySelector('table')).toBeNull()
  })

  it('deletes the table after confirming', async () => {
    store.tables.set([buildTable()])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const harness = await render()

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button.btn-danger')!.click()
    await harness.fixture.whenStable()

    expect(store.delete).toHaveBeenCalledWith('rest-1', 'table-1')
  })

  it('does not delete the table when the confirmation is cancelled', async () => {
    store.tables.set([buildTable()])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const harness = await render()

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button.btn-danger')!.click()
    await harness.fixture.whenStable()

    expect(store.delete).not.toHaveBeenCalled()
  })

  it('alerts that an occupied table cannot be deleted when the api responds 409', async () => {
    store.tables.set([buildTable({ status: 'ocupada' })])
    store.delete.mockRejectedValue({ status: 409, error: { error: 'TableOccupiedError' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const harness = await render()

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button.btn-danger')!.click()
    await harness.fixture.whenStable()

    expect(alertSpy).toHaveBeenCalledWith('No se puede eliminar una mesa ocupada.')
  })
})
