import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '@resttek/web-shared';
import { Table, TableStatus, UpdateTableStatusDto } from '../models/table.model';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  getAll(restaurantId: string): Observable<Table[]> {
    return this.http.get<Table[]>(this.baseUrl(restaurantId));
  }

  updateStatus(restaurantId: string, tableId: string, status: TableStatus): Observable<Table> {
    const dto: UpdateTableStatusDto = { status };
    return this.http.patch<Table>(`${this.baseUrl(restaurantId)}/${tableId}/status`, dto);
  }

  private baseUrl(restaurantId: string): string {
    return `${this.apiUrl}/restaurants/${restaurantId}/tables`;
  }
}
