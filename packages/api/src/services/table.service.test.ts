import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('should accept all valid statuses', () => {
        const validStatuses = ['libre', 'ocupada', 'reservada']
        for (const s of validStatuses) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should normalize uppercase and surrounding spaces', () => {
        expect(normalizeTableStatus('  LIBRE ')).toBe('libre')
    })

    it('should throw InvalidTableStatusError for invalid status', () => {
        expect(() => normalizeTableStatus('rota')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('rota')).toThrow('Invalid table status: rota. Must be one of: libre, ocupada, reservada')
    })

    it('should throw InvalidTableStatusError for empty status', () => {
        expect(() => normalizeTableStatus('')).toThrow(InvalidTableStatusError)
    })
})
