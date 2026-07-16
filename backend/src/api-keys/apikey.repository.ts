import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'

export interface ApiKeyRow {
  id: bigint
  apiKey: string
  accountId: bigint
  description: string | null
  permissions: Record<string, boolean>
  expiresAt: Date | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export const apikeyRepository = {
  async create(data: {
    apiKey: string; accountId: bigint; description?: string
    permissions: Record<string, boolean>; expiresAt?: string | null
  }): Promise<ApiKeyRow> {
    const r = await query(`
      INSERT INTO api_keys (id, api_key, account_id, description, permissions, expires_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, api_key as "apiKey", account_id as "accountId",
                description, permissions, expires_at as "expiresAt",
                status, created_at as "createdAt", updated_at as "updatedAt"
    `, [nextSnowflake(), data.apiKey, data.accountId, data.description || null,
      JSON.stringify(data.permissions), data.expiresAt ? new Date(data.expiresAt) : null])
    return r.rows[0] as ApiKeyRow
  },

  async findByKey(apiKey: string): Promise<(ApiKeyRow & { bankCredentialId: bigint | null }) | null> {
    const r = await query(`
      SELECT ak.id, ak.api_key as "apiKey", ak.account_id as "accountId",
             ak.description, ak.permissions, ak.expires_at as "expiresAt",
             ak.status, ak.created_at as "createdAt", ak.updated_at as "updatedAt",
             a.bank_credential_id as "bankCredentialId"
      FROM api_keys ak
      INNER JOIN accounts a ON ak.account_id = a.id
      WHERE ak.api_key = $1 AND ak.deleted_at IS NULL
    `, [apiKey])
    return r.rowCount ? r.rows[0] as ApiKeyRow & { bankCredentialId: bigint | null } : null
  },

  async listByAccount(accountId: bigint): Promise<ApiKeyRow[]> {
    const r = await query(`
      SELECT id, api_key as "apiKey", account_id as "accountId",
             description, permissions, expires_at as "expiresAt",
             status, created_at as "createdAt", updated_at as "updatedAt"
      FROM api_keys WHERE account_id = $1 AND deleted_at IS NULL
      AND status = 'active' ORDER BY created_at DESC
    `, [accountId])
    return r.rows as ApiKeyRow[]
  },

  async getById(id: bigint): Promise<ApiKeyRow | null> {
    const r = await query(`
      SELECT id, api_key as "apiKey", account_id as "accountId",
             description, permissions, expires_at as "expiresAt",
             status, created_at as "createdAt", updated_at as "updatedAt"
      FROM api_keys WHERE id = $1 AND deleted_at IS NULL
    `, [id])
    return r.rowCount ? r.rows[0] as ApiKeyRow : null
  },

  async revoke(id: bigint): Promise<void> {
    await query("UPDATE api_keys SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id])
  },

  async markExpired(id: bigint): Promise<void> {
    await query("UPDATE api_keys SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id])
  },
}
