import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableOccupiedError,
    InvalidTableNumberError,
    InvalidCapacityError,
    InvalidPeopleError,
    InvalidTableStatusError
} from '@errors/DomainErrors.js'

const createResponse = () => {
    const res = {} as Response
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

const handle = (error: unknown) => {
    const res = createResponse()
    errorHandler(error, {} as Request, res, vi.fn() as unknown as NextFunction)
    return res
}

describe('errorHandler', () => {
    it('should respond 404 for TableNotFoundError', () => {
        const res = handle(new TableNotFoundError())

        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it.each([
        [new DuplicatedTableNumberError(), 'DuplicatedTableNumberError', 'Table number already exists in this restaurant'],
        [new TableNotAvailableError(), 'TableNotAvailableError', 'Table is not available'],
        [new TableOccupiedError(), 'TableOccupiedError', 'Cannot delete an occupied table']
    ])('should respond 409 for %s', (error, name, message) => {
        const res = handle(error)

        expect(res.status).toHaveBeenCalledWith(409)
        expect(res.json).toHaveBeenCalledWith({ error: name, message })
    })

    it.each([
        [new InvalidTableNumberError(), 'Table number must be a positive integer'],
        [new InvalidCapacityError(), 'Capacity must be a positive integer'],
        [new InvalidPeopleError(), 'People must be a positive integer'],
        [new InvalidTableStatusError(), 'Invalid table status']
    ])('should respond 400 by default for %s', (error, message) => {
        const res = handle(error)

        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: error.name, message })
    })

    it('should respond 500 for unknown errors', () => {
        const res = handle(new Error('boom'))

        expect(res.status).toHaveBeenCalledWith(500)
    })
})
