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
  const uc = await query(
    'SELECT tenant_id FROM tenant_users WHERE user_id = $1 AND role = $2 LIMIT 1',
    [params.userId, 'owner']
  )
  if (!uc.rowCount) {
    throw new Error('No se encontró un cliente asociado a este usuario')
  }
  const tenantId = uc.rows[0].tenant_id

  await query(
    `UPDATE tenants SET
       document_type = $1, document_number = $2, date_of_birth = $3,
       nationality = $4, address = $5,
       kyc_level = CASE WHEN kyc_level = 'none' THEN 'basic' ELSE kyc_level END,
       kyc_submitted_at = CURRENT_TIMESTAMP
     WHERE id = $6`,
    [params.documentType, params.documentNumber, params.birthDate,
     params.nationality, params.address, tenantId]
  )

  logger.info('KYC submitted', { userId: params.userId, tenantId, level: 'basic' })
  return { kycId: tenantId, level: 'basic' as KYCLevel }
}

export async function approveKYC(userId: bigint | string, level: KYCLevel = 'verified') {
  const uc = await query(
    'SELECT tenant_id FROM tenant_users WHERE user_id = $1 LIMIT 1',
    [userId]
  )
  if (!uc.rowCount) throw new Error('Cliente no encontrado')
  const tenantId = uc.rows[0].tenant_id

  await query(
    `UPDATE tenants SET kyc_level = $1, kyc_verified_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [level, tenantId]
  )
  logger.info('KYC approved', { userId, tenantId, level })

  if (level === 'premium') {
    await query(
      'UPDATE wallets SET max_daily = 50000, max_monthly = 500000 WHERE tenant_id = $1',
      [tenantId]
    )
  } else if (level === 'verified') {
    await query(
      'UPDATE wallets SET max_daily = 10000, max_monthly = 100000 WHERE tenant_id = $1',
      [tenantId]
    )
  }
}

export async function rejectKYC(userId: bigint | string, reason: string) {
  const uc = await query(
    'SELECT tenant_id FROM tenant_users WHERE user_id = $1 LIMIT 1',
    [userId]
  )
  if (!uc.rowCount) throw new Error('Cliente no encontrado')
  const tenantId = uc.rows[0].tenant_id

  await query(
    `UPDATE tenants SET kyc_level = 'none', kyc_rejection_reason = $1 WHERE id = $2`,
    [reason, tenantId]
  )
  logger.info('KYC rejected', { userId, reason })
}

export async function getKYCStatus(userId: bigint | string): Promise<KYCLevel> {
  const result = await query(
    `SELECT t.kyc_level FROM tenants t
     JOIN tenant_users tu ON ut.tenant_id = t.id
     WHERE ut.user_id = $1 AND ut.deleted_at IS NULL`,
    [userId]
  )
  return (result.rows[0]?.kyc_level as KYCLevel) || 'none'
}

export async function getPendingKYC(limit = 50) {
  const result = await query(
    `SELECT t.*, u.email FROM tenants t
     JOIN tenant_users tu ON ut.tenant_id = t.id
     JOIN users u ON u.id = ut.user_id
     WHERE t.kyc_level = 'basic' AND t.kyc_verified_at IS NULL
     ORDER BY t.kyc_submitted_at ASC LIMIT $1`,
    [limit]
  )
  return result.rows
}
