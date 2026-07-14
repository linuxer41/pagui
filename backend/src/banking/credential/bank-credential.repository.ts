import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface BankCredentialRow {
  id: bigint
  bankId: bigint
  accountNumber: string
  accountName: string
  merchantId: string
  username: string
  password: string
  encryptionKey: string
  environment: string
  apiBaseUrl: string
  status: string
  createdAt: Date
}

export const bankCredentialRepository = {
  async create(data: {
    bankId: bigint; accountNumber: string; accountName: string; merchantId: string
    username: string; password: string; encryptionKey: string
    environment: string; apiBaseUrl: string
  }): Promise<BankCredentialRow> {
    const r = await query(`
      INSERT INTO bank_credentials (id, bank_id, account_number, account_name, merchant_id,
        username, password, encryption_key, environment, api_base_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [nextSnowflake(), data.bankId, data.accountNumber, data.accountName, data.merchantId,
      data.username, data.password, data.encryptionKey, data.environment, data.apiBaseUrl])
    return r.rows[0] as BankCredentialRow
  },

  async getById(id: bigint): Promise<BankCredentialRow | null> {
    const r = await query('SELECT * FROM bank_credentials WHERE id = $1 AND deleted_at IS NULL', [id])
    return r.rowCount ? r.rows[0] as BankCredentialRow : null
  },

  async listByBank(bankId: bigint): Promise<BankCredentialRow[]> {
    const r = await query('SELECT * FROM bank_credentials WHERE bank_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [bankId])
    return r.rows as BankCredentialRow[]
  },

  async list(filters: { environment?: string; status?: string } = {}): Promise<BankCredentialRow[]> {
    const conditions: string[] = ['deleted_at IS NULL']; const params: unknown[] = []; let pc = 0
    if (filters.environment) { pc++; conditions.push(`environment = $${pc}`); params.push(filters.environment) }
    if (filters.status) { pc++; conditions.push(`status = $${pc}`); params.push(filters.status) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const r = await query(`SELECT * FROM bank_credentials ${where} ORDER BY created_at DESC`, params)
    return r.rows as BankCredentialRow[]
  },

  async update(id: bigint, data: Partial<Omit<BankCredentialRow, 'id' | 'createdAt'>>): Promise<void> {
    const sets: string[] = []; const params: unknown[] = []; let pc = 0
    const map: Record<string, string> = { accountNumber: 'account_number', accountName: 'account_name', merchantId: 'merchant_id', apiBaseUrl: 'api_base_url', encryptionKey: 'encryption_key' }
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue
      pc++; sets.push(`${map[k] || k.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${pc}`); params.push(v)
    }
    if (sets.length) {
      await query(`UPDATE bank_credentials SET ${sets.join(', ')} WHERE id = $${pc + 1}`, [...params, id])
    }
  },
}
