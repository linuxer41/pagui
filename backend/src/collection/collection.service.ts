import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'

export interface CollectionConfigRow {
  id: bigint
  walletId: bigint
  useDefault: boolean
  banecoCredentialId: bigint | null
  bankAccountId: bigint | null
  collectionType: string
  commissionRate: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

const CFG_COLS = `id, wallet_id as "walletId", use_default as "useDefault",
  baneco_credential_id as "banecoCredentialId", bank_account_id as "bankAccountId",
  collection_type as "collectionType", commission_rate as "commissionRate",
  is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`

export const collectionService = {
  async getConfig(walletId: bigint): Promise<CollectionConfigRow | null> {
    const r = await query(`SELECT ${CFG_COLS} FROM collection_config WHERE wallet_id = $1 AND deleted_at IS NULL`, [walletId])
    return r.rowCount ? r.rows[0] as CollectionConfigRow : null
  },

  async upsertConfig(walletId: bigint, data: {
    useDefault?: boolean; banecoCredentialId?: bigint | null
    bankAccountId?: bigint | null; collectionType?: string; commissionRate?: number
  }): Promise<CollectionConfigRow> {
    const existing = await collectionService.getConfig(walletId)
    if (existing) {
      const r = await query(`
        UPDATE collection_config
        SET use_default = $1, baneco_credential_id = $2, bank_account_id = $3,
          collection_type = $4, commission_rate = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 RETURNING ${CFG_COLS}
      `, [data.useDefault ?? true, data.banecoCredentialId ?? null, data.bankAccountId ?? null,
        data.collectionType ?? 'gateway',         data.commissionRate ?? 0.1, existing.id])
      return r.rows[0] as CollectionConfigRow
    }
    const r = await query(`
      INSERT INTO collection_config (id, wallet_id, use_default, baneco_credential_id, bank_account_id, collection_type, commission_rate, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING ${CFG_COLS}
    `, [nextSnowflake(), walletId, data.useDefault ?? true,
        data.banecoCredentialId ?? null, data.bankAccountId ?? null,
        data.collectionType ?? 'gateway', data.commissionRate ?? 0.1])
    return r.rows[0] as CollectionConfigRow
  },
}
