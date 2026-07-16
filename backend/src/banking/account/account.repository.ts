import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface AccountRow {
  id: bigint
  accountNumber: string
  accountType: string
  accountLevel: string
  accountSubtype: string
  currency: string
  balance: number
  availableBalance: number
  userId: bigint | null
  status: string
  bankCredentialId: bigint | null
  createdAt: Date
  updatedAt: Date
}

export interface AccountMovementRow {
  id: bigint
  accountId: bigint
  movementType: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  qrId: string | null
  transactionId: string | null
  paymentDate: Date | null
  currency: string
  senderName: string | null
  senderDocumentId: string | null
  senderAccount: string | null
  senderBankCode: string | null
  settlementId: bigint | null
  referenceId: string | null
  referenceType: string | null
  status: string
  createdAt: Date
}

export const accountRepository = {
  async create(data: { accountNumber: string; accountType: string; accountLevel?: string; accountSubtype?: string; currency?: string; bankCredentialId?: bigint; userId?: bigint }): Promise<AccountRow> {
    const r = await query(`
      INSERT INTO accounts (id, account_number, account_type, account_level, account_subtype, currency, balance, available_balance, user_id, bank_credential_id)
      VALUES ($1, $2, $3, $4, $5, $6, 0.00, 0.00, $7, $8)
      RETURNING *
    `, [nextSnowflake(), data.accountNumber, data.accountType, data.accountLevel || 'client', data.accountSubtype || 'passthrough', data.currency || 'BOB', data.userId || null, data.bankCredentialId || null])
    return r.rows[0] as AccountRow
  },

  async getById(id: bigint): Promise<AccountRow | null> {
    const r = await query('SELECT * FROM accounts WHERE id = $1 AND deleted_at IS NULL', [id])
    return r.rowCount ? r.rows[0] as AccountRow : null
  },

  async getByAccountNumber(number: string): Promise<AccountRow | null> {
    const r = await query('SELECT * FROM accounts WHERE account_number = $1 AND deleted_at IS NULL', [number])
    return r.rowCount ? r.rows[0] as AccountRow : null
  },

  async listByUser(userId: bigint): Promise<(AccountRow & { isPrimary: boolean; userRole: string })[]> {
    const r = await query(`
      SELECT a.*, ua.is_primary as "isPrimary", ua.role as "userRole"
      FROM accounts a
      JOIN user_accounts ua ON a.id = ua.account_id
      WHERE ua.user_id = $1 AND a.deleted_at IS NULL AND ua.deleted_at IS NULL
      ORDER BY ua.is_primary DESC
    `, [userId])
    return r.rows as (AccountRow & { isPrimary: boolean; userRole: string })[]
  },

  async listAll(filters: { page?: number; limit?: number; status?: string } = {}): Promise<{ accounts: AccountRow[]; totalCount: number }> {
    const page = filters.page || 1; const limit = filters.limit || 20; const offset = (page - 1) * limit
    const conditions: string[] = ['deleted_at IS NULL']; const params: unknown[] = []; let pc = 0
    if (filters.status) { pc++; conditions.push(`status = $${pc}`); params.push(filters.status) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const c = await query(`SELECT COUNT(*) as t FROM accounts ${where}`, params)
    const r = await query(`SELECT * FROM accounts ${where} ORDER BY created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`, [...params, limit, offset])
    return { accounts: r.rows as AccountRow[], totalCount: parseInt(c.rows[0].t) }
  },

  async createMovement(data: {
    accountId: bigint; movementType: string; amount: number; balanceBefore: number; balanceAfter: number
    description?: string; qrId?: string; transactionId?: string; paymentDate?: string
    currency?: string; senderName?: string; senderDocumentId?: string; senderAccount?: string
    senderBankCode?: string; settlementId?: bigint; referenceId?: string; referenceType?: string; status?: string
  }): Promise<AccountMovementRow> {
    const r = await query(`
      INSERT INTO account_movements (id, account_id, movement_type, amount, balance_before, balance_after,
        description, qr_id, transaction_id, payment_date, currency, sender_name,
        sender_document_id, sender_account, sender_bank_code, settlement_id, reference_id, reference_type, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [nextSnowflake(), data.accountId, data.movementType, data.amount, data.balanceBefore, data.balanceAfter,
      data.description || null, data.qrId || null, data.transactionId || null, data.paymentDate || null,
      data.currency || 'BOB', data.senderName || null, data.senderDocumentId || null,
      data.senderAccount || null, data.senderBankCode || null, data.settlementId || null,
      data.referenceId || null, data.referenceType || null, data.status || 'completed'])
    return r.rows[0] as AccountMovementRow
  },

  async getMovements(accountId: bigint, filters: { page?: number; limit?: number; from?: string; to?: string; type?: string } = {}): Promise<{ movements: AccountMovementRow[]; totalCount: number }> {
    const page = filters.page || 1; const limit = filters.limit || 20; const offset = (page - 1) * limit
    const conditions: string[] = ['account_id = $1', 'deleted_at IS NULL']; const params: unknown[] = [accountId]; let pc = 1
    if (filters.from) { pc++; conditions.push(`created_at >= $${pc}`); params.push(filters.from) }
    if (filters.to) { pc++; conditions.push(`created_at <= $${pc}`); params.push(filters.to) }
    if (filters.type) { pc++; conditions.push(`movement_type = $${pc}`); params.push(filters.type) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const c = await query(`SELECT COUNT(*) as t FROM account_movements ${where}`, params)
    const r = await query(`SELECT * FROM account_movements ${where} ORDER BY created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`, [...params, limit, offset])
    return { movements: r.rows as AccountMovementRow[], totalCount: parseInt(c.rows[0].t) }
  },

  async getStats(accountId: bigint): Promise<{ today: number; week: number; month: number }> {
    const r = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN amount ELSE 0 END), 0) as week,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as month
      FROM account_movements WHERE account_id = $1 AND movement_type IN ('deposit','qr_payment','transfer_in') AND deleted_at IS NULL
    `, [accountId])
    return r.rows[0] as { today: number; week: number; month: number }
  },

  async linkUser(userId: bigint, accountId: bigint, role = 'owner', isPrimary = true): Promise<void> {
    await query(`
      INSERT INTO user_accounts (user_id, account_id, role, is_primary)
      VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, account_id) DO UPDATE SET role = $3, is_primary = $4
    `, [userId, accountId, role, isPrimary])
  },

  async getBusinessAccount(): Promise<AccountRow | null> {
    const r = await query(`
      SELECT * FROM accounts WHERE account_level = 'business' AND deleted_at IS NULL LIMIT 1
    `)
    return r.rowCount ? r.rows[0] as AccountRow : null
  },

  async getByUserId(userId: bigint, accountLevel?: string): Promise<AccountRow[]> {
    let sql = `
      SELECT a.* FROM accounts a
      JOIN user_accounts ua ON a.id = ua.account_id
      WHERE ua.user_id = $1 AND a.deleted_at IS NULL AND ua.deleted_at IS NULL
    `
    const params: any[] = [userId]
    if (accountLevel) { sql += ' AND a.account_level = $2'; params.push(accountLevel) }
    const r = await query(sql, params)
    return r.rows as AccountRow[]
  },
}
