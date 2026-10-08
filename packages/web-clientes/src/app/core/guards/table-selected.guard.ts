import { inject } from '@angular/core'
import { Router, type CanActivateFn } from '@angular/router'
import { TableSelectionStore } from '../store/table-selection.store'

export const tableSelectedGuard: CanActivateFn = (route) => {
  const tableSelection = inject(TableSelectionStore)
  const router = inject(Router)
  const restaurantId = route.paramMap.get('id')!

  if (tableSelection.tableFor(restaurantId)) return true
  return router.createUrlTree(['/restaurants', restaurantId, 'table'])
}
