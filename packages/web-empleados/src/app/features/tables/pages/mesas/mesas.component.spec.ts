import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { MesasComponent } from './mesas.component';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus } from '../../models/table.model';

const buildTable = (overrides: Partial<Table> = {}): Table => ({
  id: 't1',
  restaurantId: 'rest-1',
  number: 1,
  description: null,
  capacity: 4,
  status: 'libre',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
  ...overrides
});

describe('MesasComponent', () => {
  let fixture: ComponentFixture<MesasComponent>;
  let element: HTMLElement;
  let tables: ReturnType<typeof signal<Table[]>>;
  let tableStore: {
    tables: ReturnType<typeof signal<Table[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    startPolling: ReturnType<typeof vi.fn>;
    stopPolling: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
  };

  const render = async (initialTables: Table[]) => {
    tables.set(initialTables);
    fixture = TestBed.createComponent(MesasComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  };

  beforeEach(() => {
    tables = signal<Table[]>([]);
    tableStore = {
      tables,
      loading: signal(false),
      error: signal<string | null>(null),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
      changeStatus: vi.fn().mockResolvedValue(undefined)
    };
    TestBed.configureTestingModule({
      imports: [MesasComponent],
      providers: [
        { provide: TableStore, useValue: tableStore },
        { provide: AuthStore, useValue: { user: signal({ restaurantId: 'rest-1' }) } }
      ]
    });
  });

  it('starts polling the tables of the employee restaurant and stops on destroy', async () => {
    await render([]);

    expect(tableStore.startPolling).toHaveBeenCalledWith('rest-1');

    fixture.destroy();
    expect(tableStore.stopPolling).toHaveBeenCalled();
  });

  it('renders a card per table with number, description, capacity and status badge', async () => {
    await render([
      buildTable({ id: 't1', number: 1, description: 'Terraza', capacity: 4, status: 'libre' }),
      buildTable({ id: 't2', number: 2, description: null, capacity: 6, status: 'ocupada' })
    ]);

    const cards = element.querySelectorAll('.table-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Mesa 1');
    expect(cards[0].textContent).toContain('Terraza');
    expect(cards[0].textContent).toContain('4 personas');
    expect(cards[0].querySelector('.badge')?.textContent?.trim()).toBe('Libre');
    expect(cards[0].querySelector('.badge')?.classList).toContain('badge-libre');
    expect(cards[1].textContent).toContain('Mesa 2');
    expect(cards[1].querySelector('.badge')?.textContent?.trim()).toBe('Ocupada');
    expect(cards[1].querySelector('select')?.value).toBe('ocupada');
  });

  it('shows an empty message when the restaurant has no tables', async () => {
    await render([]);

    expect(element.textContent).toContain('Todavía no hay mesas.');
    expect(element.querySelectorAll('.table-card').length).toBe(0);
  });

  it('shows the store error', async () => {
    tableStore.error.set('No se pudo cambiar el estado de la mesa.');
    await render([buildTable()]);

    expect(element.querySelector('.alert-error')?.textContent).toContain('No se pudo cambiar el estado de la mesa.');
  });

  it('calls changeStatus when the status select changes', async () => {
    await render([buildTable({ id: 't1', status: 'libre' })]);

    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = 'reservada';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(tableStore.changeStatus).toHaveBeenCalledWith('rest-1', 't1', 'reservada' satisfies TableStatus);
  });

  it('restores the select to the stored status when the change fails', async () => {
    await render([buildTable({ id: 't1', status: 'libre' })]);

    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = 'ocupada';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(select.value).toBe('libre');
  });
});
