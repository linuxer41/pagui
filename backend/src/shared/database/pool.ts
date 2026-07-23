import { Pool, QueryResult, QueryResultRow } from 'pg'
import { logger } from '../logger'

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/payments'
logger.info('Database URL', { databaseUrl })

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  try {
    const start = Date.now()
    const res = await pool.query<T>(text, params)
    const duration = Date.now() - start
    if (duration > 100) {
      logger.warn('Slow query', { text: text.substring(0, 100), duration, rows: res.rowCount })
    }
    return res
  } catch (err) {
    logger.error('Query error', { error: String(err) })
    throw err
  }
}

export async function testConnection() {
  try {
    const client = await pool.connect()
    logger.info('PostgreSQL connected')
    client.release()
  } catch (err) {
    logger.error('PostgreSQL connection error', { error: String(err) })
  }
}

export async function waitForConnection(retries = 10, baseDelay = 2000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect()
      client.release()
      logger.info('Database ready')
      return
    } catch (err) {
      if (i === retries - 1) {
        logger.error('Database not reached after retries', { error: String(err) })
        throw err
      }
      const delay = baseDelay * (i + 1)
      logger.warn('Waiting for database', { attempt: i + 1, retries, delay })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
