import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'

const tokenFor = (role: string, restaurantId: string | null = null, id = `${role}-id`) =>
    `Bearer ${jwt.sign({ id, role, restaurantId }, JWT_SECRET)}`

const ADMIN = tokenFor('admin')
const MANAGER = tokenFor('manager', 'rest-1')
const CLIENT = tokenFor('cliente', null, 'client-1')
const OTHER_CLIENT = tokenFor('cliente', null, 'client-2')
const WAITER = tokenFor('camarero', 'rest-1')

const BASE = '/api/v1/restaurants/rest-1/tables'

describe('Table routes', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        for (const id of ['rest-1', 'rest-2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', new Date().toISOString(), new Date().toISOString()]
            )
        }
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const createTable = (body: object, restaurantId = 'rest-1') =>
        request(app)
            .post(`/api/v1/restaurants/${restaurantId}/tables`)
            .set('Authorization', ADMIN)
            .send(body)

    describe('POST /', () => {
        it('should create a table as admin and not expose the occupant', async () => {
            const res = await createTable({ number: 1, description: 'Terraza', capacity: 4 })

            expect(res.status).toBe(201)
            expect(res.body).toEqual({
                id: expect.any(String),
                restaurantId: 'rest-1',
                number: 1,
                description: 'Terraza',
                capacity: 4,
                status: 'libre',
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            })
        })

        it('should respond 409 for a duplicated number in the same restaurant', async () => {
            const res = await createTable({ number: 1, capacity: 2 })

            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'DuplicatedTableNumberError', message: 'Table number already exists in this restaurant' })
        })

        it('should allow the same number in another restaurant', async () => {
            const res = await createTable({ number: 1, capacity: 2 }, 'rest-2')

            expect(res.status).toBe(201)
        })

        it('should respond 400 for an invalid capacity', async () => {
            const res = await createTable({ number: 2, capacity: 0 })

            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidCapacityError')
        })

        it('should respond 403 for a client', async () => {
            const res = await request(app).post(BASE).set('Authorization', CLIENT).send({ number: 9, capacity: 2 })

            expect(res.status).toBe(403)
        })

        it('should respond 401 without token', async () => {
            const res = await request(app).post(BASE).send({ number: 9, capacity: 2 })

            expect(res.status).toBe(401)
        })
    })

    describe('GET /', () => {
        it('should list the tables of the restaurant ordered by number for employees', async () => {
            await createTable({ number: 3, capacity: 6 })
            await createTable({ number: 2, capacity: 2 })

            const res = await request(app).get(BASE).set('Authorization', MANAGER)

            expect(res.status).toBe(200)
            expect(res.body.map((t: any) => t.number)).toEqual([1, 2, 3])
            expect(res.body[0]).not.toHaveProperty('occupiedBy')
        })

        it('should respond 403 for a client', async () => {
            const res = await request(app).get(BASE).set('Authorization', CLIENT)

            expect(res.status).toBe(403)
        })

        it('should respond 401 without token', async () => {
            const res = await request(app).get(BASE)

            expect(res.status).toBe(401)
        })
    })

    describe('GET /:id', () => {
        it('should return a table', async () => {
            const created = await createTable({ number: 20, capacity: 2 })

            const res = await request(app).get(`${BASE}/${created.body.id}`).set('Authorization', ADMIN)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(created.body)
        })

        it('should respond 404 for a non-existent table', async () => {
            const res = await request(app).get(`${BASE}/missing`).set('Authorization', ADMIN)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'TableNotFoundError', message: 'Table not found' })
        })

        it('should respond 404 for a table of another restaurant', async () => {
            const other = await createTable({ number: 20, capacity: 2 }, 'rest-2')

            const res = await request(app).get(`${BASE}/${other.body.id}`).set('Authorization', ADMIN)

            expect(res.status).toBe(404)
        })
    })

    describe('PUT /:id', () => {
        it('should update a table as admin', async () => {
            const created = await createTable({ number: 30, capacity: 2 })

            const res = await request(app)
                .put(`${BASE}/${created.body.id}`)
                .set('Authorization', ADMIN)
                .send({ number: 31, description: 'Ventana', capacity: 4, status: 'reservada' })

            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ id: created.body.id, number: 31, description: 'Ventana', capacity: 4, status: 'reservada', createdAt: created.body.createdAt })
        })

        it('should respond 409 when the number belongs to another table', async () => {
            const created = await createTable({ number: 32, capacity: 2 })

            const res = await request(app)
                .put(`${BASE}/${created.body.id}`)
                .set('Authorization', ADMIN)
                .send({ number: 1, capacity: 2, status: 'libre' })

            expect(res.status).toBe(409)
        })

        it('should respond 404 for a non-existent table', async () => {
            const res = await request(app)
                .put(`${BASE}/missing`)
                .set('Authorization', ADMIN)
                .send({ number: 99, capacity: 2, status: 'libre' })

            expect(res.status).toBe(404)
        })

        it('should respond 403 for a client', async () => {
            const res = await request(app).put(`${BASE}/any`).set('Authorization', CLIENT).send({})

            expect(res.status).toBe(403)
        })
    })

    describe('DELETE /:id', () => {
        it('should delete a table as admin', async () => {
            const created = await createTable({ number: 40, capacity: 2 })

            const res = await request(app).delete(`${BASE}/${created.body.id}`).set('Authorization', ADMIN)

            expect(res.status).toBe(204)
            expect(res.body).toEqual({})
        })

        it('should respond 409 for an occupied table', async () => {
            const created = await createTable({ number: 41, capacity: 2, status: 'ocupada' })

            const res = await request(app).delete(`${BASE}/${created.body.id}`).set('Authorization', ADMIN)

            expect(res.status).toBe(409)
            expect(res.body.error).toBe('TableOccupiedError')
        })

        it('should respond 404 for a non-existent table', async () => {
            const res = await request(app).delete(`${BASE}/missing`).set('Authorization', ADMIN)

            expect(res.status).toBe(404)
        })

        it('should respond 403 for a client', async () => {
            const res = await request(app).delete(`${BASE}/any`).set('Authorization', CLIENT)

            expect(res.status).toBe(403)
        })
    })

    describe('GET /available', () => {
        it('should list free tables with enough capacity for a client', async () => {
            const res = await request(app).get(`${BASE}/available?people=5`).set('Authorization', CLIENT)

            expect(res.status).toBe(200)
            expect(res.body.length).toBeGreaterThan(0)
            expect(res.body.every((t: any) => t.status === 'libre' && t.capacity >= 5)).toBe(true)
            expect(res.body[0]).not.toHaveProperty('occupiedBy')
        })

        it.each(['', '?people=0', '?people=-1', '?people=abc', '?people=1.5'])('should respond 400 for query "%s"', async (query) => {
            const res = await request(app).get(`${BASE}/available${query}`).set('Authorization', CLIENT)

            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidPeopleError')
        })

        it('should respond 401 without token', async () => {
            const res = await request(app).get(`${BASE}/available?people=2`)

            expect(res.status).toBe(401)
        })
    })

    describe('POST /:id/occupy', () => {
        it('should let a client occupy a free table only once', async () => {
            const created = await createTable({ number: 50, capacity: 4 })
            const url = `${BASE}/${created.body.id}/occupy`

            const first = await request(app).post(url).set('Authorization', CLIENT).send({ people: 3 })
            const again = await request(app).post(url).set('Authorization', CLIENT).send({ people: 3 })
            const second = await request(app).post(url).set('Authorization', OTHER_CLIENT).send({ people: 3 })

            expect(first.status).toBe(200)
            expect(first.body).toMatchObject({ id: created.body.id, status: 'ocupada' })
            expect(first.body).not.toHaveProperty('occupiedBy')
            expect(again.status).toBe(200)
            expect(second.status).toBe(409)
            expect(second.body).toEqual({ error: 'TableNotAvailableError', message: 'Table is not available' })
        })

        it('should let only one of two concurrent clients occupy the table', async () => {
            const created = await createTable({ number: 51, capacity: 4 })
            const url = `${BASE}/${created.body.id}/occupy`

            const responses = await Promise.all([
                request(app).post(url).set('Authorization', tokenFor('cliente', null, 'race-1')).send({ people: 2 }),
                request(app).post(url).set('Authorization', tokenFor('cliente', null, 'race-2')).send({ people: 2 })
            ])

            expect(responses.map(r => r.status).sort()).toEqual([200, 409])
        })

        it('should free the previous table of the client when occupying another one', async () => {
            const client = tokenFor('cliente', null, 'mover')
            const previous = await createTable({ number: 52, capacity: 2 })
            const next = await createTable({ number: 53, capacity: 2 })
            await request(app).post(`${BASE}/${previous.body.id}/occupy`).set('Authorization', client).send({ people: 2 })

            const res = await request(app).post(`${BASE}/${next.body.id}/occupy`).set('Authorization', client).send({ people: 2 })

            expect(res.status).toBe(200)
            const freed = await request(app).get(`${BASE}/${previous.body.id}`).set('Authorization', ADMIN)
            expect(freed.body.status).toBe('libre')
        })

        it('should respond 409 when the capacity is not enough', async () => {
            const created = await createTable({ number: 54, capacity: 2 })

            const res = await request(app).post(`${BASE}/${created.body.id}/occupy`).set('Authorization', CLIENT).send({ people: 3 })

            expect(res.status).toBe(409)
        })

        it('should respond 400 for invalid people', async () => {
            const created = await createTable({ number: 55, capacity: 2 })

            const res = await request(app).post(`${BASE}/${created.body.id}/occupy`).set('Authorization', CLIENT).send({})

            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidPeopleError')
        })

        it('should respond 404 for a non-existent table', async () => {
            const res = await request(app).post(`${BASE}/missing/occupy`).set('Authorization', CLIENT).send({ people: 2 })

            expect(res.status).toBe(404)
        })
    })

    describe('PATCH /:id/status', () => {
        it('should let a waiter change the status', async () => {
            const created = await createTable({ number: 60, capacity: 2 })

            const res = await request(app)
                .patch(`${BASE}/${created.body.id}/status`)
                .set('Authorization', WAITER)
                .send({ status: 'RESERVADA' })

            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ id: created.body.id, status: 'reservada' })
        })

        it('should respond 400 for an invalid status', async () => {
            const created = await createTable({ number: 61, capacity: 2 })

            const res = await request(app)
                .patch(`${BASE}/${created.body.id}/status`)
                .set('Authorization', WAITER)
                .send({ status: 'rota' })

            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidTableStatusError')
        })

        it('should respond 404 for a non-existent table', async () => {
            const res = await request(app).patch(`${BASE}/missing/status`).set('Authorization', WAITER).send({ status: 'libre' })

            expect(res.status).toBe(404)
        })

        it('should respond 403 for a client', async () => {
            const created = await createTable({ number: 62, capacity: 2 })

            const res = await request(app)
                .patch(`${BASE}/${created.body.id}/status`)
                .set('Authorization', CLIENT)
                .send({ status: 'libre' })

            expect(res.status).toBe(403)
        })
    })
})
