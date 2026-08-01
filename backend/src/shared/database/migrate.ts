import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool'
import { logger } from '../logger'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function migrateDB(forceReset = false): Promise<void> {
  logger.info('Running migrations...', { forceReset })

  if (!forceReset) {
    logger.info('Skipping incremental migrations — schema.sql is the source of truth')
    return
  }

  logger.warn('Force reset: dropping all tables and re-applying schema.sql')
  const schemaPath = join(__dirname, '..', '..', '..', 'schema.sql')
  if (!existsSync(schemaPath)) {
    throw new Error('schema.sql not found')
  }
  const schema = readFileSync(schemaPath, 'utf-8')

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
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, '..', '..', '..', 'migrations')
  if (!existsSync(migrationsDir)) {
    logger.info('No migrations directory found')
    return
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL DEFAULT '',
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_ms INT NOT NULL DEFAULT 0
    )
  `)

  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  if (files.length === 0) {
    logger.info('No pending migrations')
    return
  }

  for (const file of files) {
    const name = file.replace('.sql', '')
    const existing = await pool.query('SELECT name FROM _migrations WHERE name = $1', [name])
    if (existing.rowCount) {
      logger.info('Migration already applied', { name })
      continue
    }

    const start = Date.now()
    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        'INSERT INTO _migrations (name, checksum, duration_ms) VALUES ($1, $2, $3)',
        [name, '', Date.now() - start]
      )
      await client.query('COMMIT')
      logger.info('Migration applied', { name, durationMs: Date.now() - start })
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error('Migration failed', { name, error: String(err) })
      throw err
    } finally {
      client.release()
    }
  }

  logger.info('All migrations applied')
}

export async function getMigrationStatus() {
  try {
    const { rows } = await pool.query(
      'SELECT name, checksum, applied_at, duration_ms FROM _migrations ORDER BY applied_at'
    )
    return rows
  } catch {
    return []
  }
}
