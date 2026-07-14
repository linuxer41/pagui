import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface QrRow {
  id: bigint
  qrId: string
  transactionId: string
  accountId: bigint
  bankCredentialId: bigint | null
  amount: number
  currency: string
  description: string | null
  dueDate: Date
  qrImage: string | null
  singleUse: boolean
  modifyAmount: boolean
  status: string
  walletId: bigint | null
  createdAt: Date
  updatedAt: Date
}

export const qrRepository = {
  async create(data: {
    qrId: string; transactionId: string; accountId: bigint; bankCredentialId?: bigint
    amount: number; currency?: string; description?: string; dueDate: string
    qrImage?: string; singleUse?: boolean; modifyAmount?: boolean; walletId?: bigint
  }): Promise<QrRow> {
    const r = await query(`
      INSERT INTO qr_codes (id, qr_id, transaction_id, account_id, bank_credential_id,
        amount, currency, description, due_date, qr_image, single_use, modify_amount, wallet_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [nextSnowflake(), data.qrId, data.transactionId, data.accountId, data.bankCredentialId || null,
      data.amount, data.currency || 'BOB', data.description || null, data.dueDate, data.qrImage || null,
      data.singleUse !== false, data.modifyAmount === true, data.walletId || null])
    return r.rows[0] as QrRow
  },

  async getByQrId(qrId: string): Promise<QrRow | null> {
    const r = await query('SELECT * FROM qr_codes WHERE qr_id = $1 AND deleted_at IS NULL', [qrId])
    return r.rowCount ? r.rows[0] as QrRow : null
  },

  async getById(id: bigint): Promise<QrRow | null> {
    const r = await query('SELECT * FROM qr_codes WHERE id = $1 AND deleted_at IS NULL', [id])
    return r.rowCount ? r.rows[0] as QrRow : null
  },

  async listByAccount(accountId: bigint, filters: { page?: number; limit?: number; status?: string; from?: string; to?: string } = {}): Promise<{ qrs: QrRow[]; totalCount: number }> {
    const page = filters.page || 1; const limit = filters.limit || 20; const offset = (page - 1) * limit
    const conditions: string[] = ['account_id = $1', 'deleted_at IS NULL']; const params: unknown[] = [accountId]; let pc = 1
    if (filters.status) { pc++; conditions.push(`status = $${pc}`); params.push(filters.status) }
    if (filters.from) { pc++; conditions.push(`created_at >= $${pc}`); params.push(filters.from) }
    if (filters.to) { pc++; conditions.push(`created_at <= $${pc}`); params.push(filters.to) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const c = await query(`SELECT COUNT(*) as t FROM qr_codes ${where}`, params)
    const r = await query(`SELECT * FROM qr_codes ${where} ORDER BY created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`, [...params, limit, offset])
    return { qrs: r.rows as QrRow[], totalCount: parseInt(c.rows[0].t) }
  },

  async updateStatus(qrId: string, status: string): Promise<void> {
    await query("UPDATE qr_codes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE qr_id = $2", [status, qrId])
  },

  async updateQrImage(qrId: string, qrImage: string): Promise<void> {
    await query("UPDATE qr_codes SET qr_image = $1, updated_at = CURRENT_TIMESTAMP WHERE qr_id = $2", [qrImage, qrId])
  },

  async getPayments(qrId: string): Promise<any[]> {
    const r = await query(`
      SELECT * FROM account_movements WHERE qr_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC
    `, [qrId])
    return r.rows
  },
}
