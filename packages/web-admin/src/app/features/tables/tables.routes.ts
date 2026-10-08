import type { Routes } from '@angular/router'

export const TABLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/table-list/table-list.component').then(m => m.TableListComponent)
  }
]
