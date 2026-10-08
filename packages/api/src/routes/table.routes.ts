import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize, authorizeOwnRestaurant } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const tableService = new TableService(tableRepository)
const tableController = new TableController(tableService)

const STAFF = ['admin', 'manager', 'camarero', 'cocinero']

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin']), authorizeOwnRestaurant, tableController.create)
router.get('/', authenticate, authorize(STAFF), authorizeOwnRestaurant, tableController.getAll)
router.get('/available', authenticate, authorizeOwnRestaurant, tableController.getAvailable)
router.get('/:id', authenticate, authorize(STAFF), authorizeOwnRestaurant, tableController.getById)
router.put('/:id', authenticate, authorize(['admin']), authorizeOwnRestaurant, tableController.update)
router.delete('/:id', authenticate, authorize(['admin']), authorizeOwnRestaurant, tableController.delete)
router.patch('/:id/status', authenticate, authorize(STAFF), authorizeOwnRestaurant, tableController.changeStatus)
router.post('/:id/occupy', authenticate, authorizeOwnRestaurant, tableController.occupy)

export default router
