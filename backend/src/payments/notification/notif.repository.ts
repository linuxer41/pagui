import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface NotificationRow {
  id: bigint
  userId: bigint
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  isRead: boolean
  createdAt: Date
}

export const notifRepository = {
  async create(data: { userId: bigint; type: string; title: string; body?: string; data?: Record<string, unknown> }): Promise<NotificationRow> {
    const r = await query(`
      INSERT INTO notifications (id, user_id, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [nextSnowflake(), data.userId, data.type, data.title, data.body || null, data.data ? JSON.stringify(data.data) : null])
    return r.rows[0] as NotificationRow
  },

  async listByUser(userId: bigint, limit = 50, offset = 0): Promise<NotificationRow[]> {
    const r = await query(`
      SELECT * FROM notifications WHERE user_id = $1
      ORDER BY created_at DESC LIMIT $2 OFFSET $3
    `, [userId, limit, offset])
    return r.rows as NotificationRow[]
  },

  async markRead(id: bigint): Promise<void> {
    await query('UPDATE notifications SET is_read = true WHERE id = $1', [id])
  },

  async markAllRead(userId: bigint): Promise<void> {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId])
  },

  async countUnread(userId: bigint): Promise<number> {
    const r = await query('SELECT COUNT(*) as c FROM notifications WHERE user_id = $1 AND is_read = false', [userId])
    return parseInt(r.rows[0].c)
  },
}
