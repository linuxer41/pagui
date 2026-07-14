import { query } from '../shared/database/pool'
import { AppError } from '../shared/errors/app-error'
import { nextSnowflake } from '../shared/snowflake'

const OTP_RATE_LIMIT_MINUTES = 2

export const otpService = {
  async sendOTP(phone: string): Promise<void> {
    const recent = await this.getRecentAttempts(phone)
    if (recent >= 3) {
      throw new AppError(429, 'Demasiados intentos. Intente más tarde.')
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await query(`
      INSERT INTO auth_tokens (id, user_id, token, token_type, expires_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '5 minutes')
    `, [nextSnowflake(), 0, `${phone}:${code}`, 'OTP_SENT'])
    console.log(`OTP for ${phone}: ${code}`)
  },

  async verifyOTP(phone: string, code: string): Promise<boolean> {
    const r = await query(`
      SELECT id, token FROM auth_tokens
      WHERE token LIKE $1 AND token_type = 'OTP_SENT' AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `, [`${phone}:%`])
    if (r.rowCount === 0) throw new AppError(400, 'Código inválido o expirado')

    const stored = r.rows[0].token.split(':')[1]
    if (stored !== code) {
      await query('DELETE FROM auth_tokens WHERE id = $1', [r.rows[0].id])
      throw new AppError(400, 'Código incorrecto')
    }

    await query('DELETE FROM auth_tokens WHERE id = $1', [r.rows[0].id])
    await query("INSERT INTO auth_tokens (id, user_id, token, token_type) VALUES ($1, 0, $2, 'OTP_VERIFIED')",
      [nextSnowflake(), `${phone}:${code}`])
    return true
  },

  async getRecentAttempts(phone: string): Promise<number> {
    const r = await query(`
      SELECT COUNT(*) as count FROM auth_tokens
      WHERE token LIKE $1 AND token_type = 'OTP_SENT'
      AND created_at > CURRENT_TIMESTAMP - INTERVAL '${OTP_RATE_LIMIT_MINUTES} minutes'
    `, [`${phone}%`])
    return parseInt(r.rows[0].count)
  },
}
