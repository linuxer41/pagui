import { query } from '../shared/database/pool'
import { cron } from '../shared/database/pool'

export const monitorService = {
  async getSystemStats() {
    const users = await query('SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL')
    const qrs = await query('SELECT COUNT(*) as c FROM qr_codes WHERE deleted_at IS NULL')
    const movements = await query('SELECT COUNT(*) as c FROM account_movements WHERE deleted_at IS NULL')
    const activeQrs = await query("SELECT COUNT(*) as c FROM qr_codes WHERE status = 'active' AND deleted_at IS NULL")

    return {
      totalUsers: parseInt(users.rows[0].c),
      totalQRCodes: parseInt(qrs.rows[0].c),
      totalTransactions: parseInt(movements.rows[0].c),
      activeQRCodes: parseInt(activeQrs.rows[0].c),
    }
  },
}
