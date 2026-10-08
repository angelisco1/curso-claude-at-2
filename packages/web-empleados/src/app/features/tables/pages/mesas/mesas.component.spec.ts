import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { MesasComponent } from './mesas.component';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus } from '../../models/table.model';
import { OrderStore } from '../../../orders/store/order.store';
import { Order } from '../../../orders/models/order.model';

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

const buildOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'o1',
  restaurantId: 'rest-1',
  tableId: 't1',
  clientId: null,
  createdAt: '2026-10-08T10:00:00.000Z',
  items: [],
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
  let orderStore: {
    orders: ReturnType<typeof signal<Order[]>>;
    startPolling: ReturnType<typeof vi.fn>;
    stopPolling: ReturnType<typeof vi.fn>;
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
    orderStore = {
      orders: signal<Order[]>([]),
      startPolling: vi.fn(),
      stopPolling: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [MesasComponent],
      providers: [
        { provide: TableStore, useValue: tableStore },
        { provide: OrderStore, useValue: orderStore },
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

  it('starts and stops polling the active orders of the restaurant', async () => {
    await render([]);

    expect(orderStore.startPolling).toHaveBeenCalledWith('rest-1');

    fixture.destroy();
    expect(orderStore.stopPolling).toHaveBeenCalled();
  });

  it('lists the dishes of the active orders of an occupied table with their status', async () => {
    orderStore.orders.set([
      buildOrder({
        id: 'o1',
        tableId: 't1',
        items: [
          { id: 'i1', dishId: 'd1', quantity: 2, notes: null, status: 'preparando', dishName: 'Paella' },
          { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'listo', dishName: 'Caña' }
        ]
      }),
      buildOrder({
        id: 'o2',
        tableId: 't1',
        items: [{ id: 'i3', dishId: 'd3', quantity: 1, notes: null, status: 'pendiente', dishName: 'Flan' }]
      })
    ]);
    await render([buildTable({ id: 't1', status: 'ocupada' })]);

    const items = element.querySelectorAll('.table-card .order-item');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('2x');
    expect(items[0].textContent).toContain('Paella');
    expect(items[0].querySelector('.badge-preparando')?.textContent?.trim()).toBe('preparando');
    expect(items[1].textContent).toContain('Caña');
    expect(items[1].querySelector('.badge-listo')).not.toBeNull();
    expect(items[2].textContent).toContain('Flan');
    expect(element.textContent).not.toContain('Sin pedidos activos');
  });

  it('shows "Sin pedidos activos" for an occupied table without orders', async () => {
    await render([buildTable({ id: 't1', status: 'ocupada' })]);

    expect(element.querySelector('.table-card')?.textContent).toContain('Sin pedidos activos');
  });

  it('does not show orders for free or reserved tables', async () => {
    orderStore.orders.set([
      buildOrder({
        tableId: 't1',
        items: [{ id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente', dishName: 'Paella' }]
      })
    ]);
    await render([
      buildTable({ id: 't1', status: 'libre' }),
      buildTable({ id: 't2', number: 2, status: 'reservada' })
    ]);

    expect(element.querySelectorAll('.order-item').length).toBe(0);
    expect(element.textContent).not.toContain('Sin pedidos activos');
  });
});
