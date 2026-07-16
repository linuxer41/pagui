import { query } from '../../shared/database/pool'
import { logger } from '../../shared/logger'

interface FraudFeatures {
  amount: number
  balanceRatio: number
  txCount1m: number
  txCount1h: number
  avgTxAmount7d: number
  amountStd7d: number
  hourOfDay: number
  isWeekend: boolean
  deviceCount7d: number
  isNewDevice: boolean
}

export async function extractFeatures(
  userId: bigint | string,
  walletId: bigint | string,
  amount: number,
  deviceId?: string
): Promise<FraudFeatures> {
  const wallet = await query('SELECT balance, available_balance FROM wallets WHERE id = $1', [walletId])
  const balance = parseFloat(wallet.rows[0]?.balance || '0')

  const tx1m = await query(
    `SELECT COUNT(*) as cnt FROM transfers
     WHERE sender_wallet_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'`,
    [walletId]
  )
  const tx1h = await query(
    `SELECT COUNT(*) as cnt FROM transfers
     WHERE sender_wallet_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
    [walletId]
  )

  const tx7d = await query(
    `SELECT COALESCE(AVG(amount), 0) as avg_amt,
            COALESCE(STDDEV(amount), 0) as std_amt,
            COUNT(*) as cnt
     FROM transfers
     WHERE sender_wallet_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'`,
    [walletId]
  )

  const deviceCount = deviceId
    ? await query(
        `SELECT COUNT(*) as cnt FROM transfers t
         JOIN wallets w ON w.id = t.sender_wallet_id
         WHERE w.user_id = $1 AND t.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'`,
        [userId]
      )
    : { rows: [{ cnt: '1' }] }

  const now = new Date()
  return {
    amount,
    balanceRatio: balance > 0 ? amount / balance : 1,
    txCount1m: parseInt(tx1m.rows[0]?.cnt || '0'),
    txCount1h: parseInt(tx1h.rows[0]?.cnt || '0'),
    avgTxAmount7d: parseFloat(tx7d.rows[0]?.avg_amt || '0'),
    amountStd7d: parseFloat(tx7d.rows[0]?.std_amt || '0'),
    hourOfDay: now.getHours(),
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    deviceCount7d: parseInt(deviceCount.rows[0]?.cnt || '1'),
    isNewDevice: parseInt(deviceCount.rows[0]?.cnt || '1') <= 1,
  }
}

export function mlFraudScore(features: FraudFeatures): number {
  let score = 0

  // Amount anomaly (z-score approximation)
  if (features.avgTxAmount7d > 0 && features.amountStd7d > 0) {
    const zScore = Math.abs((features.amount - features.avgTxAmount7d) / (features.amountStd7d + 0.01))
    score += Math.min(zScore * 5, 25)
  }

  // Balance ratio
  if (features.balanceRatio > 0.5) score += 15
  if (features.balanceRatio > 0.8) score += 10

  // Velocity
  if (features.txCount1m > 3) score += 15
  if (features.txCount1h > 20) score += 10

  // Time-based
  if (features.hourOfDay >= 0 && features.hourOfDay <= 5) score += 10

  // Weekend
  if (features.isWeekend) score += 5

  // New device
  if (features.isNewDevice && features.amount > 1000) score += 20

  return Math.min(score, 100)
}

export async function mlEvaluate(params: {
  userId: bigint | string
  walletId: bigint | string
  amount: number
  deviceId?: string
  ip?: string
}): Promise<{ allowed: boolean; score: number; features: FraudFeatures; reasons: string[] }> {
  const features = await extractFeatures(params.userId, params.walletId, params.amount, params.deviceId)
  const score = mlFraudScore(features)
  const reasons: string[] = []

  if (features.balanceRatio > 0.8) reasons.push('Monto alto relativo al saldo')
  if (features.txCount1m > 3) reasons.push('Alta velocidad de transacciones')
  if (score > 50) reasons.push('Score ML elevado')
  if (features.isNewDevice && features.amount > 1000) reasons.push('Dispositivo nuevo con monto alto')

  const allowed = score < 60

  if (!allowed) {
    logger.warn('ML fraud blocked', { userId: params.userId, score, reasons: reasons.join(', '), amount: params.amount })
  }

  return { allowed, score, features, reasons }
}
