import { readFileSync, existsSync } from 'node:fs'
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
