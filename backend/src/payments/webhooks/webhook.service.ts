import { createHmac } from 'node:crypto'
import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { logger } from '../../shared/logger'
import { AppError } from '../../shared/errors/app-error'
import { apikeyRepository } from '../../api-keys/apikey.repository'

export type WebhookEvent =
  | 'transfer.created'
  | 'transfer.completed'
  | 'transfer.failed'
  | 'wallet.topup'
  | 'wallet.withdrawal'
  | 'user.registered'
  | 'fraud.alert'

export async function registerWebhook(params: {
  userId: bigint | string
  walletId: bigint | string
  url: string
  events: WebhookEvent[]
}) {
  const keys = await apikeyRepository.listByWallet(BigInt(params.walletId))
  if (keys.length === 0) {
    throw new AppError(400, 'Se requiere al menos una API Key activa en esta billetera para crear un webhook')
  }

  const result = await query(
    `INSERT INTO outgoing_webhooks (id, user_id, wallet_id, url, events)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [nextSnowflake(), params.userId, params.walletId, params.url, params.events]
  )
  return { id: result.rows[0].id }
}

export async function dispatch(event: WebhookEvent, payload: Record<string, unknown>) {
  const webhooks = await query(
    `SELECT id, wallet_id, url FROM outgoing_webhooks
     WHERE $1 = ANY(events) AND is_active = TRUE`,
    [event]
  )

  for (const wh of webhooks.rows) {
    await query(
      `INSERT INTO outgoing_webhook_jobs (id, webhook_id, event, payload)
       VALUES ($1, $2, $3, $4)`,
      [nextSnowflake(), wh.id, event, JSON.stringify(payload)]
    )
  }

  if (webhooks.rows.length > 0) {
    logger.info('Webhooks dispatched', { event, count: webhooks.rows.length })
  }
}

export async function processPendingJobs() {
  const jobs = await query(
    `SELECT j.id, j.webhook_id, j.event, j.payload, j.retry_count, w.url, w.wallet_id
     FROM outgoing_webhook_jobs j
     JOIN outgoing_webhooks w ON w.id = j.webhook_id
     WHERE j.status = 'pending' AND j.scheduled_at <= CURRENT_TIMESTAMP
     ORDER BY j.scheduled_at ASC
     LIMIT 20
     FOR UPDATE SKIP LOCKED`
  )

  const walletKeyCache = new Map<string, string>()

  for (const job of jobs.rows) {
    try {
      let apiKeyValue = walletKeyCache.get(job.wallet_id)
      if (!apiKeyValue) {
        const keys = await apikeyRepository.listByWallet(BigInt(job.wallet_id))
        if (keys.length === 0) {
          logger.warn('No active API key for wallet, skipping webhook signature', { walletId: job.wallet_id })
          continue
        }
        apiKeyValue = keys[0].apiKey
        walletKeyCache.set(job.wallet_id, apiKeyValue)
      }

      const response = await fetch(job.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': job.event,
          'X-Webhook-Signature': createSignature(apiKeyValue, job.payload),
        },
        body: job.payload,
      })

      if (response.ok) {
        await query(
          `UPDATE outgoing_webhook_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [job.id]
        )
        await query(
          `UPDATE outgoing_webhooks SET last_sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [job.webhook_id]
        )
      } else {
        throw new AppError(502, `HTTP ${response.status}`)
      }
    } catch (err: any) {
      const retryCount = job.retry_count + 1
      const status = retryCount >= 3 ? 'failed' : 'pending'
      const backoff = Math.min(Math.pow(2, retryCount) * 10_000, 600_000)
      await query(
        `UPDATE outgoing_webhook_jobs
         SET status = $1, retry_count = $2, last_error = $3,
             scheduled_at = CURRENT_TIMESTAMP + INTERVAL '${backoff} milliseconds'
         WHERE id = $4`,
        [status, retryCount, err.message, job.id]
      )

      if (status === 'failed') {
        await query(
          `UPDATE outgoing_webhooks SET last_error = $1 WHERE id = $2`,
          [err.message, job.webhook_id]
        )
        logger.error('Webhook job failed', { jobId: job.id, error: err.message })
      }
    }
  }
}

export async function getWebhooks(userId: bigint | string, walletId: bigint | string) {
  const result = await query(
    'SELECT id, wallet_id as "walletId", url, events, is_active as "isActive", last_sent_at as "lastSentAt", last_error as "lastError", created_at as "createdAt" FROM outgoing_webhooks WHERE user_id = $1 AND wallet_id = $2 ORDER BY created_at DESC',
    [userId, walletId]
  )
  return result.rows
}

export async function deleteWebhook(id: bigint | string, userId: bigint | string, walletId: bigint | string) {
  await query('DELETE FROM outgoing_webhooks WHERE id = $1 AND user_id = $2 AND wallet_id = $3', [id, userId, walletId])
}

function createSignature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function startWebhookProcessor(intervalMs = 15_000) {
  const timer = setInterval(processPendingJobs, intervalMs)
  process.on('SIGINT', () => clearInterval(timer))
  process.on('SIGTERM', () => clearInterval(timer))
  logger.info('Webhook processor started', { intervalMs })
}
