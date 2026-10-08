import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { TableService } from '../../core/services/table.service'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elige tu mesa</h1>
          <p>Indica cuántas personas sois para ver las mesas disponibles</p>
        </div>
      </div>

      <div class="search card">
        <div class="form-group">
          <label for="people">Número de personas</label>
          <input
            id="people"
            name="people"
            type="number"
            min="1"
            step="1"
            class="form-control"
            [value]="people() ?? ''"
            (input)="onPeopleInput($event)" />
        </div>
        <button type="button" class="btn btn-primary" [disabled]="!canSearch() || loading()" (click)="search()">Buscar mesas</button>
      </div>

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (searchedPeople() !== null) {
        @if (tables().length === 0) {
          <div class="empty-state">
            <p>No hay mesas disponibles para {{ searchedPeople() }} personas.</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button
                type="button"
                class="table-option card"
                [class.selected]="selectedTable()?.id === table.id"
                (click)="selectedTable.set(table)">
                <h3>Mesa {{ table.number }}</h3>
                @if (table.description) {
                  <p class="table-description">{{ table.description }}</p>
                }
                <p class="table-capacity">Hasta {{ table.capacity }} personas</p>
              </button>
            }
          </div>
          <div class="actions">
            <button type="button" class="btn btn-primary" [disabled]="!selectedTable()">Continuar</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .search {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .search .form-group {
      flex: 1;
      margin-bottom: 0;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .table-option {
      text-align: left;
      padding: 16px 20px;
      color: var(--text-primary);
      transition: all var(--transition);
    }
    .table-option:hover,
    .table-option.selected {
      border-color: var(--green-medium);
    }
    .table-option.selected {
      background: var(--green-glow);
    }
    .table-option h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .table-description {
      color: var(--text-muted);
      font-size: 13px;
    }
    .table-capacity {
      color: var(--text-secondary);
      font-size: 13px;
      margin-top: 4px;
    }
  `]
})
export class TableSelectionComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly tableService = inject(TableService)

  readonly restaurantId = this.route.snapshot.paramMap.get('id')!
  readonly people = signal<number | null>(null)
  readonly searchedPeople = signal<number | null>(null)
  readonly tables = signal<Table[]>([])
  readonly selectedTable = signal<Table | null>(null)
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  readonly canSearch = computed(() => {
    const people = this.people()
    return people !== null && Number.isInteger(people) && people > 0
  })

  onPeopleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.people.set(value === '' ? null : Number(value))
  }

  search(): void {
    const people = this.people()
    if (!this.canSearch() || people === null) return

    this.loading.set(true)
    this.error.set(null)
    this.selectedTable.set(null)

    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searchedPeople.set(people)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }
}
