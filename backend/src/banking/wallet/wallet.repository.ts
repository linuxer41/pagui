import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface WalletRow {
  id: bigint
  walletNumber: string
  name: string
  type: string
  level: string
  currency: string
  balance: number
  availableBalance: number
  heldBalance: number
  tenantId: bigint | null
  status: string
  isDefault: boolean
  isCollection: boolean
  maxPerTx: number | null
  maxDaily: number | null
  maxMonthly: number | null
}

export interface WalletMovementRow {
  id: bigint
  walletId: bigint
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

const WLT_COLS = `w.id, w.wallet_number as "walletNumber", w.name, w.type, w.level,
  w.currency, w.balance, w.available_balance as "availableBalance",
  w.held_balance as "heldBalance", w.tenant_id as "tenantId",
  w.status, w.is_default as "isDefault", w.is_collection as "isCollection",
  w.max_per_tx as "maxPerTx", w.max_daily as "maxDaily", w.max_monthly as "maxMonthly"`

const WLT_COLS_NOA = `id, wallet_number as "walletNumber", name, type, level,
  currency, balance, available_balance as "availableBalance",
  held_balance as "heldBalance", tenant_id as "tenantId",
  status, is_default as "isDefault", is_collection as "isCollection",
  max_per_tx as "maxPerTx", max_daily as "maxDaily", max_monthly as "maxMonthly"`

export const walletRepository = {
  async create(data: {
    walletNumber: string; type: string; level?: string; name?: string
    currency?: string; tenantId?: bigint
    isCollection?: boolean; isDefault?: boolean
  }): Promise<WalletRow> {
    const r = await query(`
      INSERT INTO wallets (id, wallet_number, name, type, level, currency,
        balance, available_balance, held_balance, tenant_id,
        is_collection, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, 0.00, 0.00, 0.00, $7, $8, $9)
      RETURNING ${WLT_COLS_NOA}
    `, [nextSnowflake(), data.walletNumber, data.name || 'Mi Wallet', data.type,
      data.level || 'bronze', data.currency || 'BOB', data.tenantId || null,
      data.isCollection || false, data.isDefault || false])
    return r.rows[0] as WalletRow
  },

  async getById(id: bigint): Promise<WalletRow | null> {
    const r = await query(`SELECT ${WLT_COLS} FROM wallets w WHERE w.id = $1 AND w.deleted_at IS NULL`, [id])
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async getByWalletNumber(number: string): Promise<WalletRow | null> {
    const r = await query(`SELECT ${WLT_COLS} FROM wallets w WHERE w.wallet_number = $1 AND w.deleted_at IS NULL`, [number])
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async listByTenant(tenantId: bigint): Promise<(WalletRow & { userRole: string })[]> {
    const r = await query(`
      SELECT ${WLT_COLS}, COALESCE(wp.role, 'viewer') as "userRole"
      FROM wallets w
      LEFT JOIN wallet_permissions wp ON w.id = wp.wallet_id AND wp.deleted_at IS NULL
      WHERE w.tenant_id = $1 AND w.deleted_at IS NULL
    `, [tenantId])
    return r.rows as (WalletRow & { userRole: string })[]
  },

  async listByUser(userId: bigint): Promise<(WalletRow & { permissionRole: string; holderName: string })[]> {
    const r = await query(`
      SELECT ${WLT_COLS}, wp.role as "permissionRole",
        t.full_name as "holderName"
      FROM wallets w
      JOIN wallet_permissions wp ON w.id = wp.wallet_id
      LEFT JOIN tenants t ON t.id = w.tenant_id
      WHERE wp.user_id = $1 AND w.deleted_at IS NULL AND wp.deleted_at IS NULL AND (t.id IS NULL OR t.deleted_at IS NULL)
      ORDER BY wp.role ASC
    `, [userId])
    return r.rows as (WalletRow & { permissionRole: string; holderName: string })[]
  },

  async listAll(filters: { page?: number; limit?: number; status?: string } = {}): Promise<{ wallets: WalletRow[]; totalCount: number }> {
    const page = filters.page || 1; const limit = filters.limit || 20; const offset = (page - 1) * limit
    const conditions: string[] = ['deleted_at IS NULL']; const params: unknown[] = []; let pc = 0
    if (filters.status) { pc++; conditions.push(`status = $${pc}`); params.push(filters.status) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const c = await query(`SELECT COUNT(*) as t FROM wallets ${where}`, params)
    const r = await query(`SELECT ${WLT_COLS_NOA} FROM wallets ${where} ORDER BY id DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`, [...params, limit, offset])
    return { wallets: r.rows as WalletRow[], totalCount: parseInt(c.rows[0].t) }
  },

  async createMovement(data: {
    walletId: bigint; movementType: string; amount: number; balanceBefore: number; balanceAfter: number
    description?: string; qrId?: string; transactionId?: string; paymentDate?: string
    currency?: string; senderName?: string; senderDocumentId?: string; senderAccount?: string
    senderBankCode?: string; settlementId?: bigint; referenceId?: string; referenceType?: string; status?: string
  }): Promise<WalletMovementRow> {
    const r = await query(`
      INSERT INTO wallet_movements (id, wallet_id, movement_type, amount, balance_before, balance_after,
        description, qr_id, transaction_id, payment_date, currency, sender_name,
        sender_document_id, sender_account, sender_bank_code, settlement_id, reference_id, reference_type, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [nextSnowflake(), data.walletId, data.movementType, data.amount, data.balanceBefore, data.balanceAfter,
      data.description || null, data.qrId || null, data.transactionId || null, data.paymentDate || null,
      data.currency || 'BOB', data.senderName || null, data.senderDocumentId || null,
      data.senderAccount || null, data.senderBankCode || null, data.settlementId || null,
      data.referenceId || null, data.referenceType || null, data.status || 'completed'])
    return r.rows[0] as WalletMovementRow
  },

  async getMovements(walletId: bigint, filters: { page?: number; limit?: number; from?: string; to?: string; type?: string } = {}): Promise<{ movements: WalletMovementRow[]; totalCount: number }> {
    const page = filters.page || 1; const limit = filters.limit || 20; const offset = (page - 1) * limit
    const conditions: string[] = ['wallet_id = $1', 'deleted_at IS NULL']; const params: unknown[] = [walletId]; let pc = 1
    if (filters.from) { pc++; conditions.push(`created_at >= $${pc}`); params.push(filters.from) }
    if (filters.to) { pc++; conditions.push(`created_at <= $${pc}`); params.push(filters.to) }
    if (filters.type) { pc++; conditions.push(`movement_type = $${pc}`); params.push(filters.type) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const c = await query(`SELECT COUNT(*) as t FROM wallet_movements ${where}`, params)
    const r = await query(`SELECT * FROM wallet_movements ${where} ORDER BY created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`, [...params, limit, offset])
    return { movements: r.rows as WalletMovementRow[], totalCount: parseInt(c.rows[0].t) }
  },

  async getStats(walletId: bigint): Promise<{ today: number; week: number; month: number }> {
    const r = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN amount ELSE 0 END), 0) as week,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as month
      FROM wallet_movements WHERE wallet_id = $1 AND movement_type IN ('deposit','qr_payment','transfer_in') AND deleted_at IS NULL
    `, [walletId])
    return r.rows[0] as { today: number; week: number; month: number }
  },

  async getBusinessAccount(): Promise<WalletRow | null> {
    const r = await query(`SELECT ${WLT_COLS} FROM wallets w WHERE w.type = 'business' AND w.deleted_at IS NULL LIMIT 1`)
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async update(id: bigint, data: Partial<{
    type: string; status: string
    name?: string; isCollection?: boolean; level?: string; isDefault?: boolean
    tenantId?: bigint | null
  }>): Promise<WalletRow | null> {
    const sets: string[] = []; const params: unknown[] = [id]; let pc = 1
    if (data.type !== undefined) { pc++; sets.push(`type = $${pc}`); params.push(data.type) }
    if (data.status !== undefined) { pc++; sets.push(`status = $${pc}`); params.push(data.status) }
    if (data.name !== undefined) { pc++; sets.push(`name = $${pc}`); params.push(data.name) }
    if (data.isCollection !== undefined) { pc++; sets.push(`is_collection = $${pc}`); params.push(data.isCollection) }
    if (data.level !== undefined) { pc++; sets.push(`level = $${pc}`); params.push(data.level) }
    if (data.isDefault !== undefined) { pc++; sets.push(`is_default = $${pc}`); params.push(data.isDefault) }
    if (data.tenantId !== undefined) { pc++; sets.push(`tenant_id = $${pc}`); params.push(data.tenantId) }
    if (sets.length === 0) return null
    sets.push('updated_at = CURRENT_TIMESTAMP')
    const r = await query(`UPDATE wallets SET ${sets.join(', ')} WHERE id = $1 AND deleted_at IS NULL RETURNING ${WLT_COLS_NOA}`, params)
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async getCollectionByUser(userId: bigint): Promise<WalletRow | null> {
    const r = await query(`
      SELECT ${WLT_COLS} FROM wallets w
      JOIN wallet_permissions wp ON w.id = wp.wallet_id
      WHERE wp.user_id = $1 AND w.is_collection = true AND w.deleted_at IS NULL AND wp.deleted_at IS NULL
      LIMIT 1
    `, [userId])
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async getCollectionById(userId: bigint, walletId: bigint): Promise<WalletRow | null> {
    const r = await query(`
      SELECT ${WLT_COLS} FROM wallets w
      JOIN wallet_permissions wp ON w.id = wp.wallet_id
      WHERE wp.user_id = $1 AND w.id = $2 AND w.is_collection = true AND w.deleted_at IS NULL AND wp.deleted_at IS NULL
      LIMIT 1
    `, [userId, walletId])
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async getByUserId(userId: bigint, level?: string): Promise<WalletRow[]> {
    let sql = `SELECT ${WLT_COLS} FROM wallets w JOIN wallet_permissions wp ON w.id = wp.wallet_id WHERE wp.user_id = $1 AND w.deleted_at IS NULL AND wp.deleted_at IS NULL`
    const params: any[] = [userId]
    if (level) { sql += ' AND w.level = $2'; params.push(level) }
    const r = await query(sql, params)
    return r.rows as WalletRow[]
  },
}
