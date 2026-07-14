import { query } from '../database/pool'
import { nextSnowflake } from '../snowflake'
import { logger } from '../logger'

export type KYCLevel = 'none' | 'basic' | 'verified' | 'premium'

export async function submitKYC(params: {
  userId: bigint | string
  fullName: string
  documentType: 'ci' | 'passport' | 'nit'
  documentNumber: string
  birthDate: string
  nationality: string
  address: string
  selfieBase64?: string
  documentFrontBase64?: string
  documentBackBase64?: string
}) {
  const id = nextSnowflake()

  await query(
    `INSERT INTO user_profiles (id, user_id, full_name, document_type, document_number, birth_date, nationality, address, kyc_level, kyc_submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'basic', CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       full_name = $3, document_type = $4, document_number = $5,
       birth_date = $6, nationality = $7, address = $8,
       kyc_level = CASE WHEN user_profiles.kyc_level = 'none' THEN 'basic' ELSE user_profiles.kyc_level END,
       kyc_submitted_at = CURRENT_TIMESTAMP`,
    [id, params.userId, params.fullName, params.documentType, params.documentNumber,
     params.birthDate, params.nationality, params.address]
  )

  logger.info('KYC submitted', { userId: params.userId, level: 'basic' })
  return { kycId: id, level: 'basic' as KYCLevel }
}

export async function approveKYC(userId: bigint | string, level: KYCLevel = 'verified') {
  await query(
    `UPDATE user_profiles SET kyc_level = $1, kyc_verified_at = CURRENT_TIMESTAMP, kyc_verified_by = 'system'
     WHERE user_id = $2`,
    [level, userId]
  )
  logger.info('KYC approved', { userId, level })

  if (level === 'premium') {
    await query(
      'UPDATE wallets SET daily_limit = 50000, monthly_limit = 500000 WHERE user_id = $1',
      [userId]
    )
  } else if (level === 'verified') {
    await query(
      'UPDATE wallets SET daily_limit = 10000, monthly_limit = 100000 WHERE user_id = $1',
      [userId]
    )
  }
}

export async function rejectKYC(userId: bigint | string, reason: string) {
  await query(
    `UPDATE user_profiles SET kyc_level = 'none', kyc_rejection_reason = $1 WHERE user_id = $2`,
    [reason, userId]
  )
  logger.info('KYC rejected', { userId, reason })
}

export async function getKYCStatus(userId: bigint | string): Promise<KYCLevel> {
  const result = await query(
    'SELECT kyc_level FROM user_profiles WHERE user_id = $1',
    [userId]
  )
  return (result.rows[0]?.kyc_level as KYCLevel) || 'none'
}

export async function getPendingKYC(limit = 50) {
  const result = await query(
    `SELECT up.*, u.email FROM user_profiles up
     JOIN users u ON u.id = up.user_id
     WHERE up.kyc_level = 'basic' AND up.kyc_verified_at IS NULL
     ORDER BY up.kyc_submitted_at ASC LIMIT $1`,
    [limit]
  )
  return result.rows
}
