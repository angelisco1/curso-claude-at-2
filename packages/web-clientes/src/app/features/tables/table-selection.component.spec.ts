import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { TableSelectionComponent } from './table-selection.component'
import { TableService } from '../../core/services/table.service'
import { TableSelectionStore } from '../../core/store/table-selection.store'
import { Table } from '../../core/models/table.model'

const buildTable = (overrides: Partial<Table>): Table => ({
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 1,
  description: null,
  capacity: 4,
  status: 'libre',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
  ...overrides
})

const tables = [
  buildTable({ id: 'table-5', number: 5, capacity: 4, description: 'Terraza' }),
  buildTable({ id: 'table-7', number: 7, capacity: 6 })
]

describe('TableSelectionComponent', () => {
  let fixture: ComponentFixture<TableSelectionComponent>
  let el: HTMLElement
  let tableService: { getAvailable: ReturnType<typeof vi.fn>; occupy: ReturnType<typeof vi.fn> }
  let router: Router

  const peopleInput = () => el.querySelector<HTMLInputElement>('input[name="people"]')!
  const searchButton = () => findButton('Buscar mesas')
  const continueButton = () => findButton('Continuar')
  const findButton = (text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === text)!
  const tableOptions = () => Array.from(el.querySelectorAll<HTMLElement>('.table-option'))

  const typePeople = (value: string) => {
    peopleInput().value = value
    peopleInput().dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  const search = (people: string) => {
    typePeople(people)
    searchButton().click()
    fixture.detectChanges()
  }

  const selectTableAndContinue = (index: number) => {
    tableOptions()[index].click()
    fixture.detectChanges()
    continueButton().click()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    sessionStorage.clear()
    tableService = {
      getAvailable: vi.fn().mockReturnValue(of(tables)),
      occupy: vi.fn()
    }

    await TestBed.configureTestingModule({
      imports: [TableSelectionComponent],
      providers: [
        provideRouter([]),
        { provide: TableService, useValue: tableService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'rest-1' }) } } }
      ]
    }).compileComponents()

    router = TestBed.inject(Router)
    vi.spyOn(router, 'navigate').mockResolvedValue(true)

    fixture = TestBed.createComponent(TableSelectionComponent)
    el = fixture.nativeElement
    fixture.detectChanges()
  })

  it('asks for the number of people', () => {
    expect(peopleInput()).not.toBeNull()
    expect(searchButton()).toBeDefined()
  })

  it('does not allow searching with an empty, zero or negative number of people', () => {
    expect(searchButton().disabled).toBe(true)
    typePeople('0')
    expect(searchButton().disabled).toBe(true)
    typePeople('-2')
    expect(searchButton().disabled).toBe(true)
    typePeople('2.5')
    expect(searchButton().disabled).toBe(true)
    typePeople('3')
    expect(searchButton().disabled).toBe(false)
  })

  it('searches the available tables with the number of people entered', () => {
    search('3')

    expect(tableService.getAvailable).toHaveBeenCalledWith('rest-1', 3)
  })

  it('renders the available tables returned by the api', () => {
    search('3')

    const options = tableOptions()
    expect(options.length).toBe(2)
    expect(options[0].textContent).toContain('Mesa 5')
    expect(options[0].textContent).toContain('Terraza')
    expect(options[0].textContent).toContain('4 personas')
    expect(options[1].textContent).toContain('Mesa 7')
  })

  it('shows a message when there are no available tables', () => {
    tableService.getAvailable.mockReturnValue(of([]))

    search('8')

    expect(el.textContent).toContain('No hay mesas disponibles para 8 personas.')
    expect(tableOptions().length).toBe(0)
  })

  it('keeps Continuar disabled until a table is selected', () => {
    search('3')
    expect(continueButton().disabled).toBe(true)

    tableOptions()[1].click()
    fixture.detectChanges()

    expect(continueButton().disabled).toBe(false)
    expect(tableOptions()[1].classList).toContain('selected')
  })

  describe('when pressing Continuar', () => {
    it('occupies the selected table with the number of people', () => {
      tableService.occupy.mockReturnValue(of({ ...tables[0], status: 'ocupada' }))
      search('3')

      selectTableAndContinue(0)

      expect(tableService.occupy).toHaveBeenCalledWith('rest-1', 'table-5', 3)
    })

    it('stores the occupied table and navigates to the menu', () => {
      const occupied = { ...tables[0], status: 'ocupada' as const }
      tableService.occupy.mockReturnValue(of(occupied))
      search('3')

      selectTableAndContinue(0)

      expect(TestBed.inject(TableSelectionStore).tableFor('rest-1')).toEqual(occupied)
      expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1'])
    })

    it('shows a message and reloads the tables when the table is no longer available', () => {
      tableService.occupy.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'TableNotAvailableError', message: 'Table is not available' } }))
      )
      search('3')
      tableService.getAvailable.mockReturnValue(of([tables[1]]))

      selectTableAndContinue(0)

      expect(el.textContent).toContain('Esa mesa ya no está disponible. Elige otra.')
      expect(tableService.getAvailable).toHaveBeenCalledTimes(2)
      expect(tableService.getAvailable).toHaveBeenLastCalledWith('rest-1', 3)
      expect(tableOptions().length).toBe(1)
      expect(continueButton().disabled).toBe(true)
      expect(TestBed.inject(TableSelectionStore).selected()).toBeNull()
      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('shows a generic error when occupying fails for another reason', () => {
      tableService.occupy.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      search('3')

      selectTableAndContinue(0)

      expect(el.textContent).toContain('No se pudo ocupar la mesa. Inténtalo de nuevo.')
      expect(router.navigate).not.toHaveBeenCalled()
    })
  })
})
