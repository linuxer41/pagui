import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'

export interface ApiKeyRow {
  id: bigint
  apiKey: string
  walletId: bigint
  description: string | null
  permissions: Record<string, boolean>
  expiresAt: Date | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export const apikeyRepository = {
  async create(data: {
    apiKey: string; walletId: bigint; description?: string
    permissions: Record<string, boolean>; expiresAt?: string | null
  }): Promise<ApiKeyRow> {
    const r = await query(`
      INSERT INTO api_keys (id, api_key, wallet_id, description, permissions, expires_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, api_key as "apiKey", wallet_id as "walletId",
                description, permissions, expires_at as "expiresAt",
                status, created_at as "createdAt", updated_at as "updatedAt"
    `, [nextSnowflake(), data.apiKey, data.walletId, data.description || null,
      JSON.stringify(data.permissions), data.expiresAt ? new Date(data.expiresAt) : null])
    return r.rows[0] as ApiKeyRow
  },

  async findByKey(apiKey: string): Promise<(ApiKeyRow & { banecoCredentialId: bigint | null }) | null> {
    const r = await query(`
      SELECT ak.id, ak.api_key as "apiKey", ak.wallet_id as "walletId",
             ak.description, ak.permissions, ak.expires_at as "expiresAt",
             ak.status, ak.created_at as "createdAt", ak.updated_at as "updatedAt",
             w.baneco_credential_id as "banecoCredentialId"
      FROM api_keys ak
      INNER JOIN wallets w ON ak.wallet_id = w.id
      WHERE ak.api_key = $1 AND ak.deleted_at IS NULL
    `, [apiKey])
    return r.rowCount ? r.rows[0] as ApiKeyRow & { banecoCredentialId: bigint | null } : null
  },

  async listByWallet(walletId: bigint): Promise<ApiKeyRow[]> {
    const r = await query(`
      SELECT id, api_key as "apiKey", wallet_id as "walletId",
             description, permissions, expires_at as "expiresAt",
             status, created_at as "createdAt", updated_at as "updatedAt"
      FROM api_keys WHERE wallet_id = $1 AND deleted_at IS NULL
      AND status = 'active' ORDER BY created_at DESC
    `, [walletId])
    return r.rows as ApiKeyRow[]
  },

  async getById(id: bigint): Promise<ApiKeyRow | null> {
    const r = await query(`
      SELECT id, api_key as "apiKey", wallet_id as "walletId",
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
