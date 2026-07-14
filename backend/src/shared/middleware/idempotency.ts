import { Elysia } from 'elysia'
import { query } from '../database/pool'
import { AppError } from '../errors/app-error'
import { nextSnowflake } from '../snowflake'
import { logger } from '../logger'

export function idempotency() {
  return new Elysia({ name: 'idempotency' })
    .derive({ as: 'scoped' }, async (ctx) => {
      const key = ctx.headers['idempotency-key'] as string
      if (!key) return {}

      const existing = await query(
        'SELECT response_body FROM idempotency_keys WHERE idempotency_key = $1 AND expires_at > CURRENT_TIMESTAMP',
        [key]
      )

      if (existing.rowCount && existing.rowCount > 0) {
        logger.info('Idempotency hit', { key })
        throw new AppError(409, 'Idempotency conflict', {
          key,
          previousResponse: existing.rows[0].response_body,
        })
      }

      return { idempotencyKey: key }
    })
}

export async function storeIdempotencyResponse(key: string, responseBody: unknown) {
  try {
    await query(
      `INSERT INTO idempotency_keys (id, idempotency_key, response_body, expires_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '24 hours')
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [nextSnowflake(), key, JSON.stringify(responseBody)]
    )
  } catch (e) {
    logger.error('Failed to store idempotency', { key, error: e })
  }
}
