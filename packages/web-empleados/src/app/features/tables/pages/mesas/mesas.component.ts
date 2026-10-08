import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statusOptions: { value: TableStatus; label: string }[] = [
    { value: 'libre', label: 'Libre' },
    { value: 'ocupada', label: 'Ocupada' },
    { value: 'reservada', label: 'Reservada' }
  ];

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId;
  }

  ngOnInit(): void {
    if (this.restaurantId) {
      this.tableStore.startPolling(this.restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  async changeStatus(table: Table, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    if (this.restaurantId) {
      await this.tableStore.changeStatus(this.restaurantId, table.id, select.value as TableStatus);
    }
    const current = this.tableStore.tables().find(t => t.id === table.id);
    select.value = current?.status ?? table.status;
  }

  getStatusLabel(status: TableStatus): string {
    return this.statusOptions.find(option => option.value === status)?.label ?? status;
  }

  getStatusClass(status: TableStatus): string {
    return `badge badge-${status}`;
  }
}
