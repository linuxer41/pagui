import { query } from '../database/pool'
import { nextSnowflake } from '../snowflake'
import { logger } from '../logger'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ocrDocument, verifyFaces } from './ml/ml-client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = join(__dirname, '..', '..', '..', '..')
const UPLOAD_ROOT = join(BACKEND_ROOT, 'uploads', 'kyc')
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export type KYCLevel = 'none' | 'basic' | 'verified' | 'premium'

function tenantIdForUser(userId: bigint | string): Promise<bigint> {
  return query(
    'SELECT tenant_id FROM tenant_users WHERE user_id = $1 AND role = $2 LIMIT 1',
    [userId, 'owner']
  ).then((r) => {
    if (!r.rowCount) throw new Error('No se encontró un cliente asociado a este usuario')
    return r.rows[0].tenant_id as bigint
  })
}

function saveImage(userId: bigint | string, kind: 'selfie' | 'front' | 'back', base64: string): string {
  const raw = base64.replace(/^data:[a-z0-9/+-]+;base64,/i, '')
  const buffer = Buffer.from(raw, 'base64')
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Imagen inválida o demasiado grande')
  }
  const ext = buffer[0] === 0xff && buffer[1] === 0xd8 ? 'jpg' : 'png'
  const dir = join(UPLOAD_ROOT, String(userId))
  mkdirSync(dir, { recursive: true })
  const name = `${kind}-${nextSnowflake().toString()}.${ext}`
  writeFileSync(join(dir, name), buffer)
  logger.info('KYC image saved', { userId, kind, name, bytes: buffer.length })
  return `/uploads/kyc/${userId}/${name}`
}

function toBigInt(v: bigint | string): bigint {
  return typeof v === 'bigint' ? v : BigInt(v)
}

/** Persiste un envío KYC completo (datos + fotos + verificación ML). */
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
  const userId = toBigInt(params.userId)
  const tenantId = await tenantIdForUser(userId)

  let selfieUrl: string | null = null
  let frontUrl: string | null = null
  let backUrl: string | null = null
  if (params.selfieBase64) selfieUrl = saveImage(userId, 'selfie', params.selfieBase64)
  if (params.documentFrontBase64) frontUrl = saveImage(userId, 'front', params.documentFrontBase64)
  if (params.documentBackBase64) backUrl = saveImage(userId, 'back', params.documentBackBase64)

  let ocrText: string | null = null
  let ocrConfidence: number | null = null
  let faceMatch: boolean | null = null
  let faceSimilarity: number | null = null
  let mlRunAt: Date | null = null

  try {
    if (params.documentFrontBase64) {
      const ocr = await ocrDocument(params.documentFrontBase64)
      ocrText = ocr.text || null
      ocrConfidence = ocr.confidence || null
      if (!params.documentNumber && ocr.fields?.documentNumber) {
        params = { ...params, documentNumber: ocr.fields.documentNumber }
      }
      if (!params.fullName && ocr.fields?.fullName) {
        params = { ...params, fullName: ocr.fields.fullName }
      }
    }
    if (params.selfieBase64 && params.documentFrontBase64) {
      const verify = await verifyFaces(params.selfieBase64, params.documentFrontBase64)
      faceMatch = verify.match
      faceSimilarity = verify.similarity
      if (!verify.detected) {
        throw new Error('No se pudo detectar un rostro en las fotos')
      }
    }
    mlRunAt = new Date()
  } catch (err) {
    logger.warn('KYC ML step failed, continuing with basic submit', {
      userId, tenantId, error: String(err && (err as Error).message || err),
    })
  }

  await query(
    `UPDATE tenants SET
       document_type = $1, document_number = $2, date_of_birth = $3,
       nationality = $4, address = $5,
       photo_url = COALESCE($6, photo_url),
       kyc_selfie_url = COALESCE($7, kyc_selfie_url),
       kyc_document_front_url = COALESCE($8, kyc_document_front_url),
       kyc_document_back_url = COALESCE($9, kyc_document_back_url),
       kyc_ocr_text = COALESCE($10, kyc_ocr_text),
       kyc_ocr_confidence = COALESCE($11, kyc_ocr_confidence),
       kyc_face_match = COALESCE($12, kyc_face_match),
       kyc_face_similarity = COALESCE($13, kyc_face_similarity),
       kyc_ml_run_at = COALESCE($14, kyc_ml_run_at),
       kyc_level = CASE
         WHEN $15 = TRUE THEN 'verified'
         WHEN kyc_level = 'none' THEN 'basic'
         ELSE kyc_level END,
       kyc_submitted_at = CURRENT_TIMESTAMP
     WHERE id = $16`,
    [params.documentType, params.documentNumber, params.birthDate,
     params.nationality, params.address,
     selfieUrl, selfieUrl, frontUrl, backUrl,
     ocrText, ocrConfidence, faceMatch, faceSimilarity, mlRunAt,
     faceMatch, tenantId]
  )

  const level: KYCLevel = faceMatch === true ? 'verified' : 'basic'
  if (level === 'verified') {
    await query(
      'UPDATE wallets SET max_daily = 10000, max_monthly = 100000 WHERE tenant_id = $1',
      [tenantId]
    )
  }

  logger.info('KYC submitted', { userId, tenantId, level, ocrConfidence, faceMatch, faceSimilarity })
  return { kycId: tenantId, level }
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
     JOIN tenant_users tu ON tu.tenant_id = t.id
     WHERE tu.user_id = $1 AND tu.deleted_at IS NULL`,
    [userId]
  )
  return (result.rows[0]?.kyc_level as KYCLevel) || 'none'
}

export async function getPendingKYC(limit = 50) {
  const result = await query(
    `SELECT t.*, u.email FROM tenants t
     JOIN tenant_users tu ON tu.tenant_id = t.id
     JOIN users u ON u.id = tu.user_id
     WHERE t.kyc_level = 'basic' AND t.kyc_verified_at IS NULL
     ORDER BY t.kyc_submitted_at ASC LIMIT $1`,
    [limit]
  )
  return result.rows
}
