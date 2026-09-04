import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'

export interface DebitNoteRow {
  id: bigint
  tenantId: bigint
  correlative: string
  periodLabel: string
  year: number
  month: number
  amount: number
  currency: string
  qrId: string | null
  status: string
  paidAt: Date | null
  createdAt: Date
}

export const debitNoteService = {
  async upsert(tenantId: bigint, year: number, month: number, correlative: string, periodLabel: string, amount: number, qrId: string | null): Promise<DebitNoteRow> {
    const existing = await query(`SELECT id FROM debit_notes WHERE tenant_id = $1 AND year = $2 AND month = $3`, [tenantId, year, month])
    if (existing.rowCount) {
      const r = await query(`
        UPDATE debit_notes SET correlative = $1, period_label = $2, amount = $3, qr_id = COALESCE($4, qr_id), updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $5 AND year = $6 AND month = $7
        RETURNING id, tenant_id as "tenantId", correlative, period_label as "periodLabel", year, month, amount::float as amount, currency, qr_id as "qrId", status, paid_at as "paidAt", created_at as "createdAt"
      `, [correlative, periodLabel, amount, qrId, tenantId, year, month])
      return r.rows[0] as DebitNoteRow
    }
    const r = await query(`
      INSERT INTO debit_notes (id, tenant_id, correlative, period_label, year, month, amount, qr_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING id, tenant_id as "tenantId", correlative, period_label as "periodLabel", year, month, amount::float as amount, currency, qr_id as "qrId", status, paid_at as "paidAt", created_at as "createdAt"
    `, [nextSnowflake(), tenantId, correlative, periodLabel, year, month, amount, qrId])
    return r.rows[0] as DebitNoteRow
  },

  async get(tenantId: bigint, year: number, month: number): Promise<DebitNoteRow | null> {
    const r = await query(`SELECT id, tenant_id as "tenantId", correlative, period_label as "periodLabel", year, month, amount::float as amount, currency, qr_id as "qrId", status, paid_at as "paidAt", created_at as "createdAt" FROM debit_notes WHERE tenant_id = $1 AND year = $2 AND month = $3`, [tenantId, year, month])
    return r.rowCount ? r.rows[0] as DebitNoteRow : null
  },

  async markPaidByQrId(qrId: string): Promise<DebitNoteRow | null> {
    const r = await query(`
      UPDATE debit_notes SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE qr_id = $1 AND status = 'pending'
      RETURNING id, tenant_id as "tenantId", correlative, status, paid_at as "paidAt"
    `, [qrId])
    if (!r.rowCount) return null
    // También marcar el qr como usado ya lo hace qrService, pero aquí solo actualizamos debit note
    return r.rows[0] as DebitNoteRow
  },

  async markPaid(tenantId: bigint, year: number, month: number): Promise<DebitNoteRow | null> {
    const r = await query(`
      UPDATE debit_notes SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND year = $2 AND month = $3 AND status = 'pending'
      RETURNING id, tenant_id as "tenantId", correlative, status
    `, [tenantId, year, month])
    return r.rowCount ? r.rows[0] as DebitNoteRow : null
  }
}
