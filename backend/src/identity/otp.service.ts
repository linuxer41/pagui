import crypto from 'node:crypto'
import { query } from '../shared/database/pool'
import { AppError } from '../shared/errors/app-error'
import { nextSnowflake } from '../shared/snowflake'
import { logger } from '../shared/logger'

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || ''
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || ''

const MAX_SEND_ATTEMPTS = 3
const SEND_WINDOW_MIN = 2
const MAX_VERIFY_ATTEMPTS = 5
const OTP_EXPIRATION_MIN = 5
const VERIFIED_TOKEN_EXPIRATION_MIN = 2

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!WHATSAPP_API_URL) {
    logger.warn('WHATSAPP_API_URL no configurada', { phone })
    return
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (WHATSAPP_API_KEY) headers['apikey'] = WHATSAPP_API_KEY
  const number = `591${phone}`
  const url = `${WHATSAPP_API_URL}/send/text`
  const body = { number, text: message }
  logger.info('Enviando WhatsApp', { phone, number, url, hasKey: !!WHATSAPP_API_KEY })
  const start = Date.now()
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const elapsed = Date.now() - start
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    logger.error('WhatsApp falló', { phone, status: res.status, error: JSON.stringify(err), elapsed })
    throw new AppError(502, `Error al enviar WhatsApp: ${res.status}`)
  }
  logger.info('WhatsApp enviado', { phone, status: res.status, elapsed })
}

export const otpService = {
  async sendOTP(phone: string): Promise<{ code: string } | void> {
    const recent = await this.getRecentSendAttempts(phone)
    if (recent >= MAX_SEND_ATTEMPTS) {
      throw new AppError(429, `Demasiados intentos. Espere ${SEND_WINDOW_MIN} minutos.`)
    }

    const code = crypto.randomInt(100000, 999999).toString()
    const codeHash = hashCode(code)

    await query('DELETE FROM otp_codes WHERE phone = $1 AND verified_at IS NULL', [phone])

    await query(`
      INSERT INTO otp_codes (id, phone, code_hash, attempts, expires_at)
      VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP + INTERVAL '${OTP_EXPIRATION_MIN} minutes')
    `, [nextSnowflake(), phone, codeHash])

    logger.info('OTP generated', { phone })

    const msg = `Tu código de verificación PAGUI es: *${code}*`
    await sendWhatsApp(phone, msg)

    if (process.env.NODE_ENV === 'test' || process.env.E2E_OTP_IN_RESPONSE === 'true') {
      return { code }
    }
  },

  async verifyOTP(phone: string, code: string): Promise<boolean> {
    const r = await query(`
      SELECT id, code_hash, attempts FROM otp_codes
      WHERE phone = $1 AND verified_at IS NULL AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `, [phone])

    if (r.rowCount === 0) throw new AppError(400, 'Código inválido o expirado')

    const row = r.rows[0] as { id: bigint; code_hash: string; attempts: number }

    if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new AppError(429, 'Demasiados intentos fallidos. Solicite un nuevo código.')
    }

    const computedHash = hashCode(code)

    if (computedHash !== row.code_hash) {
      await query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [row.id])
      const remaining = MAX_VERIFY_ATTEMPTS - row.attempts - 1
      if (remaining <= 0) {
        throw new AppError(429, 'Demasiados intentos fallidos. Solicite un nuevo código.')
      }
      throw new AppError(400, `Código incorrecto. Intentos restantes: ${remaining}`)
    }

    await query(
      "UPDATE otp_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = $1",
      [row.id]
    )

    return true
  },

  async isPhoneVerified(phone: string): Promise<boolean> {
    const r = await query(`
      SELECT id FROM otp_codes
      WHERE phone = $1 AND verified_at IS NOT NULL
        AND verified_at > CURRENT_TIMESTAMP - INTERVAL '${VERIFIED_TOKEN_EXPIRATION_MIN} minutes'
      ORDER BY created_at DESC LIMIT 1
    `, [phone])
    return r.rowCount > 0
  },

  async getRecentSendAttempts(phone: string): Promise<number> {
    const r = await query(`
      SELECT COUNT(*) as count FROM otp_codes
      WHERE phone = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '${SEND_WINDOW_MIN} minutes'
    `, [phone])
    return parseInt(r.rows[0].count)
  },
}
