import { query } from '../database/pool'
import { nextSnowflake } from '../snowflake'
import { logger } from '../logger'

export type AuditAction =
  | 'user.login' | 'user.logout' | 'user.register'
  | 'user.password_change' | 'user.kyc_update'
  | 'wallet.create' | 'wallet.balance_change'
  | 'transfer.create' | 'transfer.complete' | 'transfer.fail'
  | 'subscription.create' | 'subscription.cancel'
  | 'merchant.register' | 'merchant.payment'
  | 'admin.action' | 'settings.change'
  | 'api_key.create' | 'api_key.revoke'
  | 'device.register' | 'device.unregister'
  | 'fraud.alert' | 'compliance.check'

export async function logAudit(params: {
  userId?: bigint | string
  action: AuditAction
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}) {
  try {
    await query(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        nextSnowflake(),
        params.userId || null,
        params.action,
        params.resourceType || null,
        params.resourceId || null,
        params.details ? JSON.stringify(params.details) : null,
        params.ip || null,
        params.userAgent || null,
      ]
    )
  } catch (err) {
    logger.error('Audit log failed', { error: String(err), action: params.action })
  }
}

export async function searchAudit(params: {
  userId?: bigint | string
  action?: AuditAction
  resourceType?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}) {
  const conditions: string[] = []
  const values: unknown[] = []
  let pc = 0

  if (params.userId) { pc++; conditions.push(`user_id = $${pc}`); values.push(params.userId) }
  if (params.action) { pc++; conditions.push(`action = $${pc}`); values.push(params.action) }
  if (params.resourceType) { pc++; conditions.push(`resource_type = $${pc}`); values.push(params.resourceType) }
  if (params.fromDate) { pc++; conditions.push(`created_at >= $${pc}`); values.push(params.fromDate) }
  if (params.toDate) { pc++; conditions.push(`created_at <= $${pc}`); values.push(params.toDate) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = params.limit || 50
  const offset = params.offset || 0

  const result = await query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`,
    [...values, limit, offset]
  )
  return result.rows
}

export async function getAuditStats(days = 30) {
  const result = await query(
    `SELECT action, COUNT(*) as count, DATE(created_at) as date
     FROM audit_logs
     WHERE created_at > CURRENT_TIMESTAMP - $1::interval
     GROUP BY action, DATE(created_at)
     ORDER BY date DESC`,
    [`${days} days`]
  )
  return result.rows
}
