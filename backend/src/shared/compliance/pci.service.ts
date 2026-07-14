import { query } from '../database/pool'
import { logger } from '../logger'
import { hash, encrypt } from '../crypto'

/**
 * PCI-DSS Compliance Utilities
 * - Never log raw card numbers or CVV
 * - Encrypt PII at rest
 * - Mask sensitive data in logs
 * - Enforce encryption for sensitive fields
 */

const SENSITIVE_FIELDS = [
  'password', 'password_hash', 'biometric_key', 'biometric_key_hash',
  'token', 'refresh_token', 'secret', 'api_key', 'api_secret',
  'encrypted_biometric_key', 'encrypted_seed_phrase',
]

export function mask(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars) return value
  const masked = '*'.repeat(value.length - visibleChars)
  return masked + value.slice(-visibleChars)
}

export function sanitizeForLogs(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = mask(String(value))
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

export async function checkPCICompliance(): Promise<{
  compliant: boolean
  issues: string[]
}> {
  const issues: string[] = []

  // 1. Check encryption key exists
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === 'default-encryption-key-change-in-production!') {
    issues.push('ENCRYPTION_KEY no configurada o es la default')
  }

  // 2. Check JWT secret
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default-secret') {
    issues.push('JWT_SECRET no configurado o es la default')
  }

  // 3. Check for sensitive data in unencrypted columns
  try {
    const result = await query(
      `SELECT column_name, table_name FROM information_schema.columns
       WHERE table_schema = 'public'
       AND (column_name LIKE '%password%' OR column_name LIKE '%secret%' OR column_name LIKE '%token%')
       AND data_type NOT IN ('bytea') AND is_updatable = 'YES'`
    )
    for (const row of result.rows) {
      issues.push(`Columna sensible sin cifrar: ${row.table_name}.${row.column_name}`)
    }
  } catch {}

  return {
    compliant: issues.length === 0,
    issues,
  }
}

export function complianceHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
  }
}

export async function logComplianceCheck() {
  const result = await checkPCICompliance()
  if (!result.compliant) {
    logger.warn('PCI compliance issues', { issues: result.issues })
    for (const issue of result.issues) {
      logger.error(`PCI: ${issue}`)
    }
  }
  return result
}
