import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '@resttek/web-shared';
import { TableService } from './table.service';
import { Table } from '../models/table.model';

const table: Table = {
  id: 't1',
  restaurantId: 'rest-1',
  number: 1,
  description: 'Terraza',
  capacity: 4,
  status: 'libre',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
};

describe('TableService', () => {
  let service: TableService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' }
      ]
    });
    service = TestBed.inject(TableService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getAll requests the tables of the restaurant', () => {
    let result: Table[] | undefined;
    service.getAll('rest-1').subscribe(tables => (result = tables));

    const req = http.expectOne('/api/v1/restaurants/rest-1/tables');
    expect(req.request.method).toBe('GET');
    req.flush([table]);

    expect(result).toEqual([table]);
  });

  it('updateStatus patches the status of the table', () => {
    let result: Table | undefined;
    service.updateStatus('rest-1', 't1', 'ocupada').subscribe(t => (result = t));

    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/t1/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'ocupada' });
    req.flush({ ...table, status: 'ocupada' });

    expect(result?.status).toBe('ocupada');
  });
});
