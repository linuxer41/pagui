import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface BanecoCredentialRow {
  id: bigint
  tenantId: bigint | null
  accountHolder: string
  accountNumber: string
  merchantId: string
  username: string
  password: string
  encryptionKey: string | null
  environment: string
  apiBaseUrl: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const bankCredentialRepository = {
  async create(data: {
    accountHolder: string; accountNumber: string; merchantId?: string
    username: string; password: string; encryptionKey?: string
    environment: string; apiBaseUrl: string; tenantId?: bigint
  }): Promise<BanecoCredentialRow> {
    const r = await query(`
      INSERT INTO baneco_credentials (id, account_holder, account_number, merchant_id,
        username, password, encryption_key, environment, api_base_url, tenant_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `, [nextSnowflake(), data.accountHolder, data.accountNumber,
      data.merchantId || `MERCH-${nextSnowflake().toString().slice(-8)}`,
      data.username, data.password, data.encryptionKey || null, data.environment, data.apiBaseUrl,
      data.tenantId || null])
    return r.rows[0] as BanecoCredentialRow
  },

  async getById(id: bigint): Promise<BanecoCredentialRow | null> {
    const r = await query('SELECT * FROM baneco_credentials WHERE id = $1 AND deleted_at IS NULL', [id])
    return r.rowCount ? r.rows[0] as BanecoCredentialRow : null
  },

  async list(filters: { environment?: string; tenantId?: bigint; isActive?: boolean } = {}): Promise<BanecoCredentialRow[]> {
    const conditions: string[] = ['bc.deleted_at IS NULL']; const params: unknown[] = []; let pc = 0
    if (filters.environment) { pc++; conditions.push(`bc.environment = $${pc}`); params.push(filters.environment) }
    if (filters.tenantId) { pc++; conditions.push(`bc.tenant_id = $${pc}`); params.push(filters.tenantId) }
    if (filters.isActive !== undefined) { pc++; conditions.push(`bc.is_active = $${pc}`); params.push(filters.isActive) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const r = await query(`SELECT bc.* FROM baneco_credentials bc ${where} ORDER BY bc.created_at DESC`, params)
    return r.rows as BanecoCredentialRow[]
  },

  async update(id: bigint, data: Partial<Omit<BanecoCredentialRow, 'id' | 'createdAt'>>): Promise<void> {
    const sets: string[] = []; const params: unknown[] = []; let pc = 0
    const map: Record<string, string> = {
      accountHolder: 'account_holder', accountNumber: 'account_number',
      merchantId: 'merchant_id', apiBaseUrl: 'api_base_url',
      encryptionKey: 'encryption_key', isActive: 'is_active',
    }
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue
      pc++; sets.push(`${map[k] || k.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${pc}`); params.push(v)
    }
    if (sets.length) {
      await query(`UPDATE baneco_credentials SET ${sets.join(', ')} WHERE id = $${pc + 1}`, [...params, id])
    }
  },

  async delete(id: bigint): Promise<void> {
    await query('UPDATE baneco_credentials SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id])
  },
}
