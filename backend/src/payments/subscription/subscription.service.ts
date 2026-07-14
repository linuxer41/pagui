import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { walletRepository } from '../wallet/wallet.repository'
import { transferRepository } from '../transfer/transfer.repository'
import { logger } from '../../shared/logger'

export type SubscriptionInterval = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface CreateSubscriptionParams {
  userId: bigint | string
  walletId: bigint | string
  receiverWalletId: bigint | string
  amount: number
  description?: string
  interval: SubscriptionInterval
  startDate?: Date
  endDate?: Date
  maxPayments?: number
}

export async function createSubscription(params: CreateSubscriptionParams) {
  const result = await query(
    `INSERT INTO subscriptions (id, user_id, wallet_id, receiver_wallet_id, amount, description, interval_type, start_date, end_date, max_payments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      nextSnowflake(), params.userId, params.walletId, params.receiverWalletId,
      params.amount, params.description || null, params.interval,
      params.startDate || new Date(), params.endDate || null, params.maxPayments || null,
    ]
  )
  logger.info('Subscription created', { id: result.rows[0].id, ...params })
  return { id: result.rows[0].id }
}

export async function cancelSubscription(id: bigint | string) {
  await query('UPDATE subscriptions SET is_active = FALSE, cancelled_at = CURRENT_TIMESTAMP WHERE id = $1', [id])
}

export async function listSubscriptions(userId: bigint | string) {
  const result = await query(
    'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

export async function processDueSubscriptions() {
  const due = await query(
    `SELECT s.*, w.balance, w.available_balance, w.user_id
     FROM subscriptions s
     JOIN wallets w ON w.id = s.wallet_id
     WHERE s.is_active = TRUE
       AND s.start_date <= CURRENT_TIMESTAMP
       AND (s.end_date IS NULL OR s.end_date >= CURRENT_TIMESTAMP)
       AND (s.max_payments IS NULL OR s.payment_count < s.max_payments)
       AND (
         (s.last_processed_at IS NULL AND s.start_date <= CURRENT_TIMESTAMP)
         OR
         (s.interval_type = 'daily' AND s.last_processed_at < CURRENT_TIMESTAMP - INTERVAL '1 day')
         OR
         (s.interval_type = 'weekly' AND s.last_processed_at < CURRENT_TIMESTAMP - INTERVAL '1 week')
         OR
         (s.interval_type = 'monthly' AND s.last_processed_at < CURRENT_TIMESTAMP - INTERVAL '1 month')
         OR
         (s.interval_type = 'yearly' AND s.last_processed_at < CURRENT_TIMESTAMP - INTERVAL '1 year')
       )
     LIMIT 50
     FOR UPDATE SKIP LOCKED`
  )

  let processed = 0
  for (const sub of due.rows) {
    try {
      const balance = parseFloat(sub.balance)
      const amount = parseFloat(sub.amount)

      if (balance < amount) {
        logger.warn('Subscription insufficient balance', { subId: sub.id })
        continue
      }

      const transfer = await transferRepository.create({
        senderWalletId: sub.wallet_id,
        receiverWalletId: sub.receiver_wallet_id,
        amount,
        fee: 0,
        total: amount,
        description: `[Suscripción] ${sub.description || sub.id}`,
        referenceType: 'subscription',
      })

      await walletRepository.updateBalance(sub.wallet_id, balance - amount, parseFloat(sub.available_balance) - amount)
      await transferRepository.updateStatus(transfer.id, 'completed')
      await query(
        `UPDATE subscriptions
         SET last_processed_at = CURRENT_TIMESTAMP, payment_count = payment_count + 1
         WHERE id = $1`,
        [sub.id]
      )
      processed++
    } catch (err) {
      logger.error('Subscription processing failed', { subId: sub.id, error: String(err) })
    }
  }

  if (processed > 0) logger.info('Subscriptions processed', { count: processed })
  return processed
}
