import { createHmac } from 'node:crypto'
import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { logger } from '../../shared/logger'
import { AppError } from '../../shared/errors/app-error'

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
  companyId?: bigint | string
  url: string
  secret?: string
  events: WebhookEvent[]
}) {
  const result = await query(
    `INSERT INTO outgoing_webhooks (id, user_id, company_id, url, secret, events)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [nextSnowflake(), params.userId, params.companyId || null, params.url, params.secret || null, params.events]
  )
  return result.rows[0].id
}

export async function dispatch(event: WebhookEvent, payload: Record<string, unknown>) {
  const webhooks = await query(
    `SELECT id, url, secret FROM outgoing_webhooks
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
    `SELECT j.id, j.webhook_id, j.event, j.payload, j.retry_count, w.url, w.secret
     FROM outgoing_webhook_jobs j
     JOIN outgoing_webhooks w ON w.id = j.webhook_id
     WHERE j.status = 'pending' AND j.scheduled_at <= CURRENT_TIMESTAMP
     ORDER BY j.scheduled_at ASC
     LIMIT 20
     FOR UPDATE SKIP LOCKED`
  )

  for (const job of jobs.rows) {
    try {
      const response = await fetch(job.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': job.event,
          'X-Webhook-Signature': job.secret ? createSignature(job.secret, job.payload) : '',
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

export async function getWebhooks(userId: bigint | string) {
  const result = await query(
    'SELECT id, url, events, is_active, last_sent_at, last_error, created_at FROM outgoing_webhooks WHERE user_id = $1',
    [userId]
  )
  return result.rows
}

export async function deleteWebhook(id: bigint | string, userId: bigint | string) {
  await query('DELETE FROM outgoing_webhooks WHERE id = $1 AND user_id = $2', [id, userId])
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
