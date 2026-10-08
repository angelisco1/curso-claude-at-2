import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'
const CLIENT = `Bearer ${jwt.sign({ id: 'client-1', role: 'cliente', restaurantId: null }, JWT_SECRET)}`

const insertTable = (id: string, restaurantId: string, number: number, status: string) =>
    dbConfig.run(
        'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, occupied_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, restaurantId, number, null, 4, status, null, new Date().toISOString(), new Date().toISOString()]
    )

describe('POST /api/v1/orders with tableId', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        for (const id of ['rest-1', 'rest-2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', new Date().toISOString(), new Date().toISOString()]
            )
        }
        await insertTable('occupied', 'rest-1', 1, 'ocupada')
        await insertTable('free', 'rest-1', 2, 'libre')
        await insertTable('other-restaurant', 'rest-2', 1, 'ocupada')
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const createOrder = (tableId: string | null) =>
        request(app)
            .post('/api/v1/orders')
            .set('Authorization', CLIENT)
            .send({ restaurantId: 'rest-1', tableId, items: [] })

    it('should create an order without table', async () => {
        const res = await createOrder(null)

        expect(res.status).toBe(201)
        expect(res.body.tableId).toBeNull()
    })

    it('should create an order for an occupied table', async () => {
        const res = await createOrder('occupied')

        expect(res.status).toBe(201)
        expect(res.body.tableId).toBe('occupied')
    })

    it('should respond 404 for a table that does not exist or belongs to another restaurant', async () => {
        const missing = await createOrder('missing')
        const other = await createOrder('other-restaurant')

        expect(missing.status).toBe(404)
        expect(missing.body).toEqual({ error: 'TableNotFoundError', message: 'Table not found' })
        expect(other.status).toBe(404)
    })

    it('should respond 409 for a table that is not occupied', async () => {
        const res = await createOrder('free')

        expect(res.status).toBe(409)
        expect(res.body).toEqual({ error: 'TableNotAvailableError', message: 'Table is not available' })
    })
})
