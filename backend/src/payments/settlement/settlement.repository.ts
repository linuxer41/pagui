import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface SettlementRow {
  id: bigint
  accountMovementId: bigint | null
  fromAccountId: bigint
  toBankCredentialId: bigint | null
  userId: bigint
  qrCodeId: bigint | null
  grossAmount: number
  commission: number
  commissionRate: number
  netAmount: number
  currency: string
  status: string
  reference: string | null
  errorMessage: string | null
  settledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export const settlementRepository = {
  async create(data: {
    fromAccountId: bigint; toBankCredentialId: bigint | null; userId: bigint
    grossAmount: number; commission: number; commissionRate: number; netAmount: number
    currency?: string; qrCodeId?: bigint
  }): Promise<SettlementRow> {
    const r = await query(`
      INSERT INTO settlements (id, from_account_id, to_bank_credential_id, user_id, qr_code_id,
        gross_amount, commission, commission_rate, net_amount, currency, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
      RETURNING *
    `, [nextSnowflake(), data.fromAccountId, data.toBankCredentialId || null, data.userId,
      data.qrCodeId || null, data.grossAmount, data.commission, data.commissionRate,
      data.netAmount, data.currency || 'BOB'])
    return r.rows[0] as SettlementRow
  },

  async getById(id: bigint): Promise<SettlementRow | null> {
    const r = await query('SELECT * FROM settlements WHERE id = $1', [id])
    return r.rowCount ? r.rows[0] as SettlementRow : null
  },

  async listByUser(userId: bigint, filters: { page?: number; limit?: number; status?: string } = {}): Promise<{ settlements: SettlementRow[]; totalCount: number }> {
    const page = filters.page || 1; const limit = filters.limit || 20; const offset = (page - 1) * limit
    const conditions: string[] = ['user_id = $1']; const params: unknown[] = [userId]; let pc = 1
    if (filters.status) { pc++; conditions.push(`status = $${pc}`); params.push(filters.status) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const c = await query(`SELECT COUNT(*) as t FROM settlements ${where}`, params)
    const r = await query(`SELECT * FROM settlements ${where} ORDER BY created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`, [...params, limit, offset])
    return { settlements: r.rows as SettlementRow[], totalCount: parseInt(c.rows[0].t) }
  },

  async getPending(): Promise<SettlementRow[]> {
    const r = await query("SELECT * FROM settlements WHERE status = 'pending' ORDER BY created_at ASC")
    return r.rows as SettlementRow[]
  },

  async updateStatus(id: bigint, status: string, data: { reference?: string; errorMessage?: string; accountMovementId?: bigint } = {}): Promise<void> {
    const sets: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP']
    const params: unknown[] = [status]
    let pc = 1
    if (data.reference) { pc++; sets.push(`reference = $${pc}`); params.push(data.reference) }
    if (data.errorMessage) { pc++; sets.push(`error_message = $${pc}`); params.push(data.errorMessage) }
    if (data.accountMovementId) { pc++; sets.push(`account_movement_id = $${pc}`); params.push(data.accountMovementId) }
    if (status === 'completed') { sets.push('settled_at = CURRENT_TIMESTAMP') }
    await query(`UPDATE settlements SET ${sets.join(', ')} WHERE id = $${pc + 1}`, [...params, id])
  },
}
