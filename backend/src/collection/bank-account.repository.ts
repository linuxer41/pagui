import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'

export interface BankAccountRow {
  id: bigint
  tenantId: bigint
  bankCode: string
  accountHolder: string
  accountNumber: string
  holderDocument: string
  isActive: boolean
  createdAt: Date
  deletedAt: Date | null
}

const COLS = `id, tenant_id as "tenantId", bank_code as "bankCode", account_holder as "accountHolder", account_number as "accountNumber", holder_document as "holderDocument", is_active as "isActive", created_at as "createdAt", deleted_at as "deletedAt"`

export const bankAccountRepository = {
  async create(data: {
    tenantId: bigint; bankCode: string; accountHolder: string
    accountNumber: string; holderDocument?: string
  }): Promise<BankAccountRow> {
    const r = await query(`
      INSERT INTO bank_accounts (id, tenant_id, bank_code, account_holder, account_number, holder_document)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}
    `, [nextSnowflake(), data.tenantId, data.bankCode, data.accountHolder, data.accountNumber, data.holderDocument || ''])
    return r.rows[0] as BankAccountRow
  },

  async listByTenant(tenantId: bigint): Promise<BankAccountRow[]> {
    const r = await query(`SELECT ${COLS} FROM bank_accounts WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`, [tenantId])
    return r.rows as BankAccountRow[]
  },

  async getById(id: bigint): Promise<BankAccountRow | null> {
    const r = await query(`SELECT ${COLS} FROM bank_accounts WHERE id = $1 AND deleted_at IS NULL`, [id])
    return r.rowCount ? r.rows[0] as BankAccountRow : null
  },

  async delete(id: bigint): Promise<void> {
    await query('UPDATE bank_accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id])
  },
}
