import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TableStore } from './table.store';
import { TableService } from '../services/table.service';
import { Table } from '../models/table.model';

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

describe('TableStore', () => {
  let store: TableStore;
  let tableService: { getAll: ReturnType<typeof vi.fn>; updateStatus: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tableService = { getAll: vi.fn(), updateStatus: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: TableService, useValue: tableService }]
    });
    store = TestBed.inject(TableStore);
  });

  afterEach(() => {
    store.stopPolling();
    vi.useRealTimers();
  });

  it('loadTables stores the tables of the restaurant', async () => {
    const tables = [buildTable(), buildTable({ id: 't2', number: 2 })];
    tableService.getAll.mockReturnValue(of(tables));

    await store.loadTables('rest-1');

    expect(tableService.getAll).toHaveBeenCalledWith('rest-1');
    expect(store.tables()).toEqual(tables);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('loadTables sets the error when the request fails', async () => {
    tableService.getAll.mockReturnValue(throwError(() => new Error('boom')));

    await store.loadTables('rest-1');

    expect(store.error()).toBe('No se pudieron cargar las mesas.');
    expect(store.loading()).toBe(false);
  });

  it('changeStatus replaces the table with the one returned by the api', async () => {
    tableService.getAll.mockReturnValue(of([buildTable(), buildTable({ id: 't2', number: 2 })]));
    await store.loadTables('rest-1');
    const updated = buildTable({ status: 'ocupada', updatedAt: '2026-10-08T11:00:00.000Z' });
    tableService.updateStatus.mockReturnValue(of(updated));

    await store.changeStatus('rest-1', 't1', 'ocupada');

    expect(tableService.updateStatus).toHaveBeenCalledWith('rest-1', 't1', 'ocupada');
    expect(store.tables()[0]).toEqual(updated);
    expect(store.tables()[1].status).toBe('libre');
  });

  it('changeStatus keeps the previous status and sets the error when it fails', async () => {
    tableService.getAll.mockReturnValue(of([buildTable()]));
    await store.loadTables('rest-1');
    tableService.updateStatus.mockReturnValue(throwError(() => new Error('boom')));

    await store.changeStatus('rest-1', 't1', 'reservada');

    expect(store.tables()[0].status).toBe('libre');
    expect(store.error()).toBe('No se pudo cambiar el estado de la mesa.');
  });

  it('startPolling loads the tables now and every 30 seconds until stopPolling', () => {
    vi.useFakeTimers();
    tableService.getAll.mockReturnValue(of([]));

    store.startPolling('rest-1');
    expect(tableService.getAll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30000);
    expect(tableService.getAll).toHaveBeenCalledTimes(2);

    store.stopPolling();
    vi.advanceTimersByTime(30000);
    expect(tableService.getAll).toHaveBeenCalledTimes(2);
  });
});
