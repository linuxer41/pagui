import { query } from '../../shared/database/pool'

export type MovementType = 'incoming' | 'outgoing'
export type PeriodType = 'yearly' | 'monthly' | 'weekly'

export interface TransactionRow {
  id: string
  type: MovementType
  amount: number
  from?: string
  to?: string
  date: Date
  status: string
  reference?: string
  category?: string
  metadata: {
    accountId: string
    qrId?: string
    transactionId?: string
    balanceAfter: number
    currency?: string
  }
}

export interface TransactionStatsRow {
  date: Date
  amount: number
  count: number
  formatted: Record<string, unknown>
}

export interface TransactionStatsResult {
  data: TransactionStatsRow[]
  summary: {
    total: number
    count: number
    period: Record<string, unknown>
  }
}

function mapMovement(r: any): TransactionRow {
  return {
    id: String(r.id),
    type: r.movement_type === 'credit' || r.movement_type === 'deposit' || r.movement_type === 'transfer_in' || r.movement_type === 'qr_payment' ? 'incoming' : 'outgoing',
    amount: Number(r.amount),
    from: r.sender_name || r.sender_account || undefined,
    to: r.description || undefined,
    date: r.created_at,
    status: r.status || 'completed',
    reference: r.reference_id || undefined,
    category: r.movement_type,
    metadata: {
      accountId: String(r.account_id),
      qrId: r.qr_id,
      transactionId: r.transaction_id,
      balanceAfter: Number(r.balance_after),
      currency: r.currency,
    },
  }
}

export const transactionRepository = {
  async listByUser(userId: bigint, page: number, pageSize: number): Promise<{ transactions: TransactionRow[]; totalCount: number }> {
    const offset = (page - 1) * pageSize

    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM account_movements m
       JOIN user_accounts ua ON m.account_id = ua.account_id
       WHERE ua.user_id = $1 AND m.deleted_at IS NULL AND ua.deleted_at IS NULL`,
      [userId]
    )
    const totalCount = parseInt(countResult.rows[0].total)

    const result = await query(
      `SELECT m.*
       FROM account_movements m
       JOIN user_accounts ua ON m.account_id = ua.account_id
       WHERE ua.user_id = $1 AND m.deleted_at IS NULL AND ua.deleted_at IS NULL
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    )

    return {
      transactions: result.rows.map(mapMovement),
      totalCount,
    }
  },

  async getById(id: bigint, userId: bigint): Promise<TransactionRow | null> {
    const result = await query(
      `SELECT m.*
       FROM account_movements m
       JOIN user_accounts ua ON m.account_id = ua.account_id
       WHERE m.id = $1 AND ua.user_id = $2 AND m.deleted_at IS NULL AND ua.deleted_at IS NULL`,
      [id, userId]
    )
    if (result.rowCount === 0) return null
    return mapMovement(result.rows[0])
  },

  async getYearlyStats(userId: bigint, year: number): Promise<TransactionStatsResult> {
    const result = await query(
      `SELECT
         DATE_TRUNC('month', m.created_at) as month_date,
         SUM(m.amount) as amount,
         COUNT(*) as count
       FROM account_movements m
       JOIN user_accounts ua ON m.account_id = ua.account_id
       WHERE ua.user_id = $1 AND m.deleted_at IS NULL AND ua.deleted_at IS NULL
         AND EXTRACT(YEAR FROM m.created_at) = $2
         AND m.movement_type IN ('deposit','qr_payment','transfer_in')
       GROUP BY DATE_TRUNC('month', m.created_at)
       ORDER BY month_date`,
      [userId, year]
    )

    const data = result.rows.map((r: any) => ({
      date: r.month_date,
      amount: Number(r.amount),
      count: Number(r.count),
      formatted: {
        month: new Date(r.month_date).toLocaleDateString('es', { month: 'long', year: 'numeric' }),
        amount: Number(r.amount).toLocaleString('es', { minimumFractionDigits: 2 }),
      },
    }))

    const total = data.reduce((s: number, d: any) => s + d.amount, 0)
    const count = data.reduce((s: number, d: any) => s + d.count, 0)

    return {
      data,
      summary: {
        total,
        count,
        period: { startDate: `${year}-01-01`, endDate: `${year}-12-31`, type: 'yearly' as const, year },
      },
    }
  },

  async getMonthlyStats(userId: bigint, year: number, month: number): Promise<TransactionStatsResult> {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const result = await query(
      `SELECT
         DATE(m.created_at) as day_date,
         SUM(m.amount) as amount,
         COUNT(*) as count
       FROM account_movements m
       JOIN user_accounts ua ON m.account_id = ua.account_id
       WHERE ua.user_id = $1 AND m.deleted_at IS NULL AND ua.deleted_at IS NULL
         AND m.created_at >= $2 AND m.created_at < ($3::date + INTERVAL '1 day')
         AND m.movement_type IN ('deposit','qr_payment','transfer_in')
       GROUP BY DATE(m.created_at)
       ORDER BY day_date`,
      [userId, startDate, endDate]
    )

    const data = result.rows.map((r: any) => ({
      date: r.day_date,
      amount: Number(r.amount),
      count: Number(r.count),
      formatted: {
        date: new Date(r.day_date).toLocaleDateString('es'),
        day: new Date(r.day_date).getDate(),
        month: new Date(r.day_date).toLocaleDateString('es', { month: 'short' }),
        amount: Number(r.amount).toLocaleString('es', { minimumFractionDigits: 2 }),
      },
    }))

    const total = data.reduce((s: number, d: any) => s + d.amount, 0)
    const count = data.reduce((s: number, d: any) => s + d.count, 0)

    return {
      data,
      summary: {
        total,
        count,
        period: { startDate, endDate, type: 'monthly' as const, year, month },
      },
    }
  },

  async getWeeklyStats(userId: bigint, year: number, week: number): Promise<TransactionStatsResult> {
    const firstDay = new Date(year, 0, 1)
    const daysOffset = (week - 1) * 7
    const startDate = new Date(firstDay.getTime() + daysOffset * 86400000).toISOString().split('T')[0]
    const endDate = new Date(firstDay.getTime() + (daysOffset + 6) * 86400000).toISOString().split('T')[0]

    const result = await query(
      `SELECT
         DATE(m.created_at) as day_date,
         SUM(m.amount) as amount,
         COUNT(*) as count
       FROM account_movements m
       JOIN user_accounts ua ON m.account_id = ua.account_id
       WHERE ua.user_id = $1 AND m.deleted_at IS NULL AND ua.deleted_at IS NULL
         AND m.created_at >= $2 AND m.created_at < ($3::date + INTERVAL '1 day')
         AND m.movement_type IN ('deposit','qr_payment','transfer_in')
       GROUP BY DATE(m.created_at)
       ORDER BY day_date`,
      [userId, startDate, endDate]
    )

    const data = result.rows.map((r: any) => ({
      date: r.day_date,
      amount: Number(r.amount),
      count: Number(r.count),
      formatted: {
        date: new Date(r.day_date).toLocaleDateString('es'),
        day: new Date(r.day_date).getDate(),
        month: new Date(r.day_date).toLocaleDateString('es', { month: 'short' }),
        amount: Number(r.amount).toLocaleString('es', { minimumFractionDigits: 2 }),
      },
    }))

    const total = data.reduce((s: number, d: any) => s + d.amount, 0)
    const count = data.reduce((s: number, d: any) => s + d.count, 0)

    return {
      data,
      summary: {
        total,
        count,
        period: { startDate, endDate, type: 'weekly' as const, year, week },
      },
    }
  },
}
