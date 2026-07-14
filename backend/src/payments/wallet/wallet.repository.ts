import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface WalletRow {
  id: bigint
  userId: bigint
  name: string
  type: string
  currency: string
  balance: number
  availableBalance: number
  heldBalance: number
  status: string
  isDefault: boolean
  maxPerTx: number | null
  maxDaily: number | null
  maxMonthly: number | null
  createdAt: Date
  updatedAt: Date
}

export const walletRepository = {
  async create(data: { userId: bigint; name?: string; type?: string; currency?: string }): Promise<WalletRow> {
    const r = await query(`
      INSERT INTO wallets (id, user_id, name, type, currency)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nextSnowflake(), data.userId, data.name || 'Principal', data.type || 'personal', data.currency || 'BOB'])
    return r.rows[0] as WalletRow
  },

  async getById(id: bigint): Promise<WalletRow | null> {
    const r = await query('SELECT * FROM wallets WHERE id = $1', [id])
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async listByUser(userId: bigint): Promise<WalletRow[]> {
    const r = await query('SELECT * FROM wallets WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC', [userId])
    return r.rows as WalletRow[]
  },

  async getDefault(userId: bigint): Promise<WalletRow | null> {
    const r = await query('SELECT * FROM wallets WHERE user_id = $1 AND is_default = true LIMIT 1', [userId])
    return r.rowCount ? r.rows[0] as WalletRow : null
  },

  async updateBalance(id: bigint, balance: number, availableBalance: number): Promise<void> {
    await query('UPDATE wallets SET balance = $1, available_balance = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [balance, availableBalance, id])
  },

  async holdAmount(id: bigint, amount: number): Promise<void> {
    await query(`
      UPDATE wallets SET held_balance = held_balance + $1, available_balance = available_balance - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND available_balance >= $1
    `, [amount, id])
  },

  async releaseHold(id: bigint, amount: number): Promise<void> {
    await query(`
      UPDATE wallets SET held_balance = held_balance - $1, available_balance = available_balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [amount, id])
  },
}
