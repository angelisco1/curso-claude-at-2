import { Table } from '../models/table.model';
import { Order } from '../../orders/models/order.model';

export function groupOrdersByTable(tables: Table[], orders: Order[]): Map<string, Order[]> {
  const ordersByTable = new Map<string, Order[]>(
    tables
      .filter(table => table.status === 'ocupada')
      .map(table => [table.id, []])
  );

  for (const order of orders) {
    if (order.tableId) {
      ordersByTable.get(order.tableId)?.push(order);
    }
  }

  return ordersByTable;
}
