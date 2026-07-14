import { Pool, QueryResult, QueryResultRow } from 'pg'

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/payments'

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
      console.log('Slow query:', { text: text.substring(0, 100), duration, rows: res.rowCount })
    }
    return res
  } catch (err) {
    console.error('Query error:', err)
    throw err
  }
}

export async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('PostgreSQL connected')
    client.release()
  } catch (err) {
    console.error('PostgreSQL connection error:', err)
  }
}
