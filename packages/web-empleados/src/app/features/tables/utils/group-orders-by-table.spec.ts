import { groupOrdersByTable } from './group-orders-by-table';
import { Table } from '../models/table.model';
import { Order } from '../../orders/models/order.model';

const buildTable = (overrides: Partial<Table>): Table => ({
  id: 't1',
  restaurantId: 'rest-1',
  number: 1,
  description: null,
  capacity: 4,
  status: 'ocupada',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
  ...overrides
});

const buildOrder = (id: string, tableId: string | null): Order => ({
  id,
  restaurantId: 'rest-1',
  tableId,
  clientId: null,
  createdAt: '2026-10-08T10:00:00.000Z',
  items: []
});

describe('groupOrdersByTable', () => {
  it('groups the orders of each occupied table', () => {
    const tables = [buildTable({ id: 't1' }), buildTable({ id: 't2', number: 2 })];
    const orders = [buildOrder('o1', 't1'), buildOrder('o2', 't2'), buildOrder('o3', 't1')];

    const result = groupOrdersByTable(tables, orders);

    expect(result.get('t1')?.map(o => o.id)).toEqual(['o1', 'o3']);
    expect(result.get('t2')?.map(o => o.id)).toEqual(['o2']);
  });

  it('returns an empty list for occupied tables without orders', () => {
    const result = groupOrdersByTable([buildTable({ id: 't1' })], []);

    expect(result.get('t1')).toEqual([]);
  });

  it('ignores orders without table', () => {
    const result = groupOrdersByTable([buildTable({ id: 't1' })], [buildOrder('o1', null)]);

    expect(result.get('t1')).toEqual([]);
    expect(result.size).toBe(1);
  });

  it('ignores free and reserved tables and orders of unknown tables', () => {
    const tables = [
      buildTable({ id: 't1', status: 'libre' }),
      buildTable({ id: 't2', number: 2, status: 'reservada' })
    ];
    const orders = [buildOrder('o1', 't1'), buildOrder('o2', 't2'), buildOrder('o3', 't9')];

    const result = groupOrdersByTable(tables, orders);

    expect(result.size).toBe(0);
  });
});
