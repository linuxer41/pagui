import { query } from '../../shared/database/pool'

export interface WalletPermissionRow {
  userId: bigint
  walletId: bigint
  role: string
  createdAt: Date
}

export const walletPermissionRepository = {
  async upsert(userId: bigint, walletId: bigint, role = 'owner'): Promise<void> {
    await query(`
      INSERT INTO wallet_permissions (user_id, wallet_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, wallet_id) DO UPDATE SET role = $3, deleted_at = NULL
    `, [userId, walletId, role])
  },

  async listByUser(userId: bigint): Promise<(WalletPermissionRow & {
    id: bigint; name: string; type: string; level: string; currency: string;
    balance: number; availableBalance: number; heldBalance: number;
    walletNumber: string; tenantId: bigint; status: string;
    isDefault: boolean; isCollection: boolean; holderName: string
  })[]> {
    const r = await query(`
      SELECT wp.user_id as "userId", wp.wallet_id as "walletId", wp.role,
        wp.created_at as "createdAt",
        w.id as "id", w.name, w.type, w.level, w.currency,
        w.balance, w.available_balance as "availableBalance",
        w.held_balance as "heldBalance", w.wallet_number as "walletNumber",
        w.tenant_id as "tenantId", w.status, w.is_default as "isDefault",
        w.is_collection as "isCollection",
        t.full_name as "holderName"
      FROM wallet_permissions wp
      JOIN wallets w ON w.id = wp.wallet_id
      LEFT JOIN tenants t ON t.id = w.tenant_id
      WHERE wp.user_id = $1 AND wp.deleted_at IS NULL AND w.deleted_at IS NULL AND (t.id IS NULL OR t.deleted_at IS NULL)
      ORDER BY wp.role ASC
    `, [userId])
    return r.rows as any[]
  },

  async listByWallet(walletId: bigint): Promise<WalletPermissionRow[]> {
    const r = await query(`
      SELECT user_id as "userId", wallet_id as "walletId", role,
        created_at as "createdAt"
      FROM wallet_permissions WHERE wallet_id = $1 AND deleted_at IS NULL
    `, [walletId])
    return r.rows as WalletPermissionRow[]
  },

  async remove(userId: bigint, walletId: bigint): Promise<void> {
    await query(`
      UPDATE wallet_permissions SET deleted_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND wallet_id = $2
    `, [userId, walletId])
  },
}
