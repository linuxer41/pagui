import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { logger } from '../../shared/logger'

const DAILY_LIMIT_PERCENTAGE = 0.5
const SINGLE_TX_LIMIT = 10_000
const VELOCITY_WINDOW_MS = 60_000
const VELOCITY_MAX_TX = 5

export async function evaluateFraud(params: {
  userId: bigint | string
  walletId: bigint | string
  amount: number
  ip?: string
  deviceId?: string
}): Promise<{ allowed: boolean; score: number; reasons: string[] }> {
  let score = 0
  const reasons: string[] = []

  const wallet = await query(
    'SELECT balance FROM wallets WHERE id = $1',
    [params.walletId]
  )
  if (wallet.rows.length === 0) return { allowed: false, score: 100, reasons: ['Wallet no encontrada'] }

  const balance = parseFloat(wallet.rows[0].balance)

  if (params.amount > balance) {
    score += 40
    reasons.push('Saldo insuficiente')
  }

  if (params.amount > SINGLE_TX_LIMIT) {
    score += 30
    reasons.push('Monto excede límite por transacción')
  }

  if (params.amount > balance * DAILY_LIMIT_PERCENTAGE && params.amount > 1000) {
    score += 15
    reasons.push('Monto supera 50% del saldo actual')
  }

  const recent = await query(
    `SELECT COUNT(*) as cnt FROM transfers
     WHERE sender_wallet_id = $1
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'`,
    [params.walletId]
  )
  const recentCount = parseInt(recent.rows[0].cnt)
  if (recentCount >= VELOCITY_MAX_TX) {
    score += 20
    reasons.push('Alta velocidad de transacciones')
  }

  const dailySum = await query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transfers
     WHERE sender_wallet_id = $1
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
    [params.walletId]
  )
  const dailyTotal = parseFloat(dailySum.rows[0].total)
  if (dailyTotal + params.amount > balance * 0.8) {
    score += 15
    reasons.push('Límite diario del 80% del saldo alcanzado')
  }

  if (reasons.length >= 3) {
    score += 10
  }

  const allowed = score < 60

  if (!allowed) {
    await createAlert({
      userId: params.userId,
      alertType: 'fraud_detected',
      severity: score >= 80 ? 'high' : 'medium',
      description: `Fraud score ${score}: ${reasons.join(', ')}`,
      metadata: params as any,
    })
    const safeParams = Object.fromEntries(
      Object.entries(params as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])
    )
    logger.warn('Fraud detected', { score, reasons, ...safeParams })
  }

  return { allowed, score, reasons }
}

export async function createAlert(params: {
  userId?: bigint | string
  transferId?: bigint | string
  alertType: string
  severity?: string
  description?: string
  metadata?: Record<string, unknown>
}) {
  await query(
    `INSERT INTO fraud_alerts (id, user_id, transfer_id, alert_type, severity, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      nextSnowflake(),
      params.userId || null,
      params.transferId || null,
      params.alertType,
      params.severity || 'medium',
      params.description || null,
      params.metadata ? JSON.stringify(params.metadata, (_k, v) => typeof v === 'bigint' ? Number(v) : v) : '{}',
    ]
  )
}

export async function resolveAlert(alertId: bigint | string, resolvedBy: bigint | string) {
  await query(
    `UPDATE fraud_alerts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = $1 WHERE id = $2`,
    [resolvedBy, alertId]
  )
}

export async function getOpenAlerts(userId: bigint | string) {
  const result = await query(
    'SELECT * FROM fraud_alerts WHERE user_id = $1 AND status = \'open\' ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}
