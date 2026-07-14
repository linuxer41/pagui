import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { query, pool } from './pool'
import { logger } from '../logger'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'migrations')

interface Migration {
  name: string
  sql: string
  checksum: string
}

export async function migrateDB(forceReset = false): Promise<void> {
  logger.info('Running migrations...', { forceReset })

  if (forceReset) {
    logger.warn('Force reset: dropping all tables and re-applying schema.sql')
    const schemaPath = join(__dirname, '..', '..', '..', 'schema.sql')
    if (!existsSync(schemaPath)) {
      throw new Error('schema.sql not found')
    }
    const schema = readFileSync(schemaPath, 'utf-8')

    // Run schema in a transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(schema)
      await client.query('COMMIT')
      logger.info('Schema applied successfully')
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error('Schema migration failed', { error: String(err) })
      throw err
    } finally {
      client.release()
    }
    return
  }

  // Incremental migrations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER NOT NULL DEFAULT 0
    )
  `)

  // Load and apply pending migrations
  const migrationsDir = MIGRATIONS_DIR
  if (!existsSync(migrationsDir)) {
    logger.info('No migrations directory found')
    return
  }

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const { rows: applied } = await query('SELECT name, checksum FROM _migrations')
  const appliedMap = new Map(applied.map((r: any) => [r.name, r.checksum]))

  for (const file of files) {
    if (appliedMap.has(file)) continue

    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    const checksum = crypto.createHash('sha256').update(sql).digest('hex')

    const start = Date.now()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        'INSERT INTO _migrations (name, checksum, duration_ms) VALUES ($1, $2, $3)',
        [file, checksum, Date.now() - start]
      )
      await client.query('COMMIT')
      logger.info(`Migration applied: ${file}`, { checksum, durationMs: Date.now() - start })
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error(`Migration failed: ${file}`, { error: String(err) })
      throw err
    } finally {
      client.release()
    }
  }
}

export async function getMigrationStatus() {
  try {
    const { rows } = await query(
      'SELECT name, checksum, applied_at, duration_ms FROM _migrations ORDER BY applied_at'
    )
    return rows
  } catch {
    return []
  }
}
