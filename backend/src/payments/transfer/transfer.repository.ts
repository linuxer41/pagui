import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface TransferRow {
  id: bigint
  senderWalletId: bigint
  receiverWalletId: bigint
  amount: number
  fee: number
  total: number
  currency: string
  description: string | null
  status: string
  referenceType: string | null
  referenceId: string | null
  completedAt: Date | null
  createdAt: Date
}

export const transferRepository = {
  async create(data: {
    senderWalletId: bigint; receiverWalletId: bigint; amount: number; fee: number; total: number
    currency?: string; description?: string; referenceType?: string; referenceId?: string
  }): Promise<TransferRow> {
    const r = await query(`
      INSERT INTO transfers (id, sender_wallet_id, receiver_wallet_id, amount, fee, total,
        currency, description, reference_type, reference_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [nextSnowflake(), data.senderWalletId, data.receiverWalletId, data.amount, data.fee, data.total,
      data.currency || 'BOB', data.description || null, data.referenceType || null, data.referenceId || null])
    return r.rows[0] as TransferRow
  },

  async getById(id: bigint): Promise<TransferRow | null> {
    const r = await query('SELECT * FROM transfers WHERE id = $1', [id])
    return r.rowCount ? r.rows[0] as TransferRow : null
  },

  async listByWallet(walletId: bigint, limit = 20, offset = 0): Promise<TransferRow[]> {
    const r = await query(`
      SELECT * FROM transfers WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1
      ORDER BY created_at DESC LIMIT $2 OFFSET $3
    `, [walletId, limit, offset])
    return r.rows as TransferRow[]
  },

  async updateStatus(id: bigint, status: string): Promise<void> {
    await query(`UPDATE transfers SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = $2`,
      [status, id])
  },
}
