import { query } from '../shared/database/pool'

export interface UserProfileRow {
  userId: bigint
  pinHash: string | null
  kycLevel: string
  documentType: string | null
  documentNumber: string | null
  dateOfBirth: string | null
  nationality: string | null
  isPhoneVerified: boolean
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  twoFactorMethod: string | null
  backupCodes: string[] | null
  dailyLimit: number
  monthlyLimit: number
}

export const userProfileRepository = {
  async upsert(userId: bigint, data: Partial<UserProfileRow>): Promise<void> {
    const exists = await query('SELECT user_id FROM user_profiles WHERE user_id = $1', [userId])
    if (exists.rowCount) {
      const sets: string[] = []; const params: unknown[] = []; let pc = 0
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue
        pc++; sets.push(`${k.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${pc}`); params.push(v)
      }
      if (sets.length) {
        sets.push('updated_at = CURRENT_TIMESTAMP')
        await query(`UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = $${pc + 1}`, [...params, userId])
      }
    } else {
      await query(`
        INSERT INTO user_profiles (user_id, pin_hash, kyc_level, document_type, document_number, date_of_birth, nationality, daily_limit, monthly_limit)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [userId, data.pinHash || null, data.kycLevel || 'none', data.documentType || null, data.documentNumber || null, data.dateOfBirth || null, data.nationality || null, data.dailyLimit || 5000.00, data.monthlyLimit || 50000.00])
    }
  },

  async getByUserId(userId: bigint): Promise<UserProfileRow | null> {
    const r = await query('SELECT * FROM user_profiles WHERE user_id = $1', [userId])
    return r.rowCount ? r.rows[0] as UserProfileRow : null
  },
}
