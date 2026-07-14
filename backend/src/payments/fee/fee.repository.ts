import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'

export interface FeeRuleRow {
  id: bigint
  transactionType: string
  feeType: 'percentage' | 'fixed' | 'hybrid'
  feeValue: number
  feeCap: number | null
  minAmount: number | null
  maxAmount: number | null
  isActive: boolean
  createdAt: Date
}

export const feeRepository = {
  async create(data: {
    transactionType: string; feeType: 'percentage' | 'fixed' | 'hybrid'; feeValue: number
    feeCap?: number; minAmount?: number; maxAmount?: number
  }): Promise<FeeRuleRow> {
    const r = await query(`
      INSERT INTO fee_rules (id, transaction_type, fee_type, fee_value, fee_cap, min_amount, max_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nextSnowflake(), data.transactionType, data.feeType, data.feeValue,
      data.feeCap || null, data.minAmount || null, data.maxAmount || null])
    return r.rows[0] as FeeRuleRow
  },

  async findByType(transactionType: string): Promise<FeeRuleRow[]> {
    const r = await query(
      'SELECT * FROM fee_rules WHERE transaction_type = $1 AND is_active = true ORDER BY min_amount ASC NULLS FIRST',
      [transactionType]
    )
    return r.rows as FeeRuleRow[]
  },

  async listAll(): Promise<FeeRuleRow[]> {
    const r = await query('SELECT * FROM fee_rules ORDER BY transaction_type, min_amount ASC NULLS FIRST')
    return r.rows as FeeRuleRow[]
  },

  async update(id: bigint, data: Partial<FeeRuleRow>): Promise<void> {
    const sets: string[] = []; const params: unknown[] = []; let pc = 0
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue
      pc++; sets.push(`${k.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${pc}`); params.push(v)
    }
    if (sets.length) {
      await query(`UPDATE fee_rules SET ${sets.join(', ')} WHERE id = $${pc + 1}`, [...params, id])
    }
  },

  calculateFee(amount: number, rules: FeeRuleRow[]): number {
    for (const rule of rules) {
      if (rule.minAmount && amount < rule.minAmount) continue
      if (rule.maxAmount && amount > rule.maxAmount) continue
      if (rule.feeType === 'fixed') return Math.min(rule.feeValue, rule.feeCap || Infinity)
      if (rule.feeType === 'percentage') {
        const fee = amount * (rule.feeValue / 100)
        return rule.feeCap ? Math.min(fee, rule.feeCap) : fee
      }
    }
    return 0
  },
}
