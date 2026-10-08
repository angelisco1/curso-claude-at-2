import { Injectable, signal } from '@angular/core'
import { Table } from '../models/table.model'

export interface TableSelection {
  restaurantId: string
  table: Table
}

const STORAGE_KEY = 'resttek.tableSelection'

@Injectable({ providedIn: 'root' })
export class TableSelectionStore {
  private readonly _selected = signal<TableSelection | null>(this.restore())

  readonly selected = this._selected.asReadonly()

  select(restaurantId: string, table: Table): void {
    const selection = { restaurantId, table }
    this._selected.set(selection)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  }

  clear(): void {
    this._selected.set(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }

  tableFor(restaurantId: string): Table | null {
    const selection = this._selected()
    return selection?.restaurantId === restaurantId ? selection.table : null
  }

  private restore(): TableSelection | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
}
