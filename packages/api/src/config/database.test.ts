import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Database } from './database.js'

describe('Database', () => {
    const originalDbPath = process.env.DB_PATH
    let tmpDir: string | null = null

    afterEach(() => {
        if (originalDbPath === undefined) {
            delete process.env.DB_PATH
        } else {
            process.env.DB_PATH = originalDbPath
        }
        if (tmpDir) {
            fs.rmSync(tmpDir, { recursive: true, force: true })
            tmpDir = null
        }
    })

    it('should use the file given in DB_PATH', async () => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resttek-db-'))
        const dbPath = path.join(tmpDir, 'custom.db')
        process.env.DB_PATH = dbPath

        const db = new Database()
        await db.initialize()
        await db.close()

        expect(fs.existsSync(dbPath)).toBe(true)
    })
})
