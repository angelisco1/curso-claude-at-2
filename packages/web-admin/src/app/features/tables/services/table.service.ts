import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { API_URL } from '@resttek/web-shared'
import type { Table, CreateTableDto, UpdateTableDto } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  private buildUrl(restaurantId: string): string {
    return `${this.apiUrl}/restaurants/${restaurantId}/tables`
  }

  getAll(restaurantId: string) {
    return this.http.get<Table[]>(this.buildUrl(restaurantId))
  }

  create(restaurantId: string, dto: CreateTableDto) {
    return this.http.post<Table>(this.buildUrl(restaurantId), dto)
  }

  update(restaurantId: string, id: string, dto: UpdateTableDto) {
    return this.http.put<Table>(`${this.buildUrl(restaurantId)}/${id}`, dto)
  }

  delete(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.buildUrl(restaurantId)}/${id}`)
  }
}
