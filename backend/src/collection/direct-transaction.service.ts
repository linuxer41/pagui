import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'
import { AppError } from '../shared/errors/app-error'

export interface DirectTransactionRow {
  id: bigint; userId: bigint; configId: bigint | null; qrCodeId: bigint | null
  grossAmount: number; commission: number; commissionRate: number
  commissionPaid: boolean; commissionPaidAt: Date | null
  currency: string; reference: string | null; paidAt: Date | null; createdAt: Date
}

const COLS = `id, user_id as "userId", config_id as "configId", qr_code_id as "qrCodeId",
  gross_amount as "grossAmount", commission as "commission", commission_rate as "commissionRate",
  commission_paid as "commissionPaid", commission_paid_at as "commissionPaidAt",
  currency, reference, paid_at as "paidAt", created_at as "createdAt"`

export const directTransactionService = {
  async create(data: {
    userId: bigint; configId: bigint; qrCodeId?: bigint; grossAmount: number
    commission: number; commissionRate: number; currency?: string; reference?: string
  }): Promise<DirectTransactionRow> {
    const r = await query(`
      INSERT INTO direct_transactions (id, user_id, config_id, qr_code_id, gross_amount, commission, commission_rate, currency, reference, paid_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING ${COLS}
    `, [nextSnowflake(), data.userId, data.configId, data.qrCodeId ?? null,
        data.grossAmount, data.commission, data.commissionRate,
        data.currency ?? 'BOB', data.reference ?? null])
    return r.rows[0] as DirectTransactionRow
  },

  async listByUser(userId: bigint, page = 1, limit = 50): Promise<{ items: DirectTransactionRow[]; totalCount: number }> {
    const offset = (page - 1) * limit
    const c = await query('SELECT COUNT(*) as t FROM direct_transactions WHERE user_id = $1', [userId])
    const r = await query(`SELECT ${COLS} FROM direct_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [userId, limit, offset])
    return { items: r.rows as DirectTransactionRow[], totalCount: parseInt(c.rows[0].t) }
  },

  async getPendingTotal(userId: bigint): Promise<number> {
    const r = await query('SELECT COALESCE(SUM(commission), 0) as t FROM direct_transactions WHERE user_id = $1 AND commission_paid = false', [userId])
    return parseFloat(r.rows[0].t)
  },

  async markAsPaid(id: bigint): Promise<void> {
    const r = await query('UPDATE direct_transactions SET commission_paid = true, commission_paid_at = CURRENT_TIMESTAMP WHERE id = $1 AND commission_paid = false RETURNING id', [id])
    if (!r.rowCount) throw new AppError(404, 'Transacción no encontrada o ya pagada')
  },
}
