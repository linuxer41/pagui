import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { query } from '../shared/database/pool'
import { AppError } from '../shared/errors/app-error'
import { nextSnowflake } from '../shared/snowflake'
import { userRepository } from './user.repository'
import { tenantService } from './tenants/tenant.service'
import { walletService } from '../banking/wallet/wallet.service'
import { walletPermissionRepository } from './wallet-permission/wallet-permission.repository'
import { otpService } from './otp.service'

const JWT_SECRET = () => process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || '24h'

export interface UserAuth {
  id: bigint
  email: string
  fullName: string
  role: number
  status: string
}

export const authService = {
  async login(email: string, password: string): Promise<{
    user: UserAuth; accessToken: string; refreshToken: string; expiresIn: string
  }> {
    const user = await userRepository.getByEmail(email)
    if (!user || user.status !== 'active') throw new AppError(401, 'Credenciales inválidas')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new AppError(401, 'Credenciales inválidas')

    return this.generateSession(user)
  },

  async loginWithOTP(phone: string, code: string): Promise<{
    user?: UserAuth; accessToken?: string; refreshToken?: string; expiresIn?: string
    needsRegistration: boolean; tempToken?: string
  }> {
    await otpService.verifyOTP(phone, code)

    const user = await userRepository.getByPhone(phone)
    if (!user) {
      const tempToken = jwt.sign({ phone, type: 'otp_verified' }, JWT_SECRET(), { expiresIn: '15m' })
      return { needsRegistration: true, tempToken }
    }

    return { ...(await this.generateSession(user)), needsRegistration: false }
  },

  async completeRegistration(phone: string, name: string, documentId: string, tempToken: string): Promise<{
    user: UserAuth; accessToken: string; refreshToken: string; expiresIn: string
  }> {
    const decoded = jwt.verify(tempToken, JWT_SECRET()) as any
    if (decoded.type !== 'otp_verified' || decoded.phone !== phone) {
      throw new AppError(401, 'Token de verificación inválido')
    }

    const id = nextSnowflake()
    const fakeEmail = `u_${id}@pagui.app`
    const fakePassword = crypto.randomBytes(32).toString('hex')
    await query(`
      INSERT INTO users (id, email, password, full_name, phone, address, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, 3, 'active')
    `, [id, fakeEmail, fakePassword, name, phone, documentId || null])

    const user = await userRepository.getById(id) as any
    if (!user) throw new AppError(500, 'Error al crear usuario')

    const tenant = await tenantService.create({
      fullName: name, phone, documentType: 'CI', documentNumber: documentId,
      ownerUserId: id,
    })

    const wallet = await walletService.create({
      type: 'standard', name: 'Mi Wallet', tenantId: tenant.id, isDefault: true,
    })

    await walletPermissionRepository.upsert(id, wallet.id, 'owner')

    return this.generateSession(user)
  },

  async generateSession(user: any): Promise<{
    user: UserAuth; accessToken: string; refreshToken: string; expiresIn: string
  }> {
    const accessPayload = { userId: Number(user.id), email: user.email, role: user.role }
    const accessToken = jwt.sign(accessPayload, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN() as any })
    const refreshPayload = { userId: Number(user.id), type: 'refresh' }
    const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET(), { expiresIn: '30d' as any })

    try {
      await query('INSERT INTO auth_tokens (id, user_id, token_type, token) VALUES ($1, $2, $3, $4)',
        [nextSnowflake(), user.id, 'ACCESS_TOKEN', accessToken])
      await query('INSERT INTO auth_tokens (id, user_id, token_type, token) VALUES ($1, $2, $3, $4)',
        [nextSnowflake(), user.id, 'REFRESH_TOKEN', refreshToken])
    } catch { /* non-critical */ }

    const wallets = await walletPermissionRepository.listByUser(user.id)

    return {
      user: {
        id: user.id, email: user.email, fullName: user.fullName,
        role: user.role, status: user.status,
      },
      wallets,
      accessToken, refreshToken, expiresIn: JWT_EXPIRES_IN(),
    }
  },

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET())
    } catch {
      throw new AppError(401, 'Token inválido o expirado')
    }
  },

  async verifyTokenWithDb(token: string): Promise<any> {
    const decoded = this.verifyToken(token)
    const r = await query('SELECT id FROM auth_tokens WHERE token = $1 AND token_type = $2', [token, 'ACCESS_TOKEN'])
    if (r.rowCount === 0) throw new AppError(401, 'Token revocado')
    return decoded
  },

  async getUserInfo(email: string): Promise<{ id: bigint; email: string; role: number } | null> {
    const user = await userRepository.getByEmail(email)
    if (!user) return null
    return { id: user.id, email: user.email, role: user.role }
  },

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET()) as any
    if (decoded.type !== 'refresh') throw new AppError(401, 'Token inválido')

    const r = await query('SELECT user_id FROM auth_tokens WHERE token = $1 AND token_type = $2', [refreshToken, 'REFRESH_TOKEN'])
    if (r.rowCount === 0) throw new AppError(401, 'Token expirado o inválido')

    const userId = BigInt(decoded.userId)
    const user = await userRepository.getById(userId)
    if (!user || user.status !== 'active') throw new AppError(401, 'Usuario no encontrado')

    const accessPayload = { userId: Number(user.id), email: user.email, role: user.role }
    const newAccessToken = jwt.sign(accessPayload, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN() as any })
    const newRefreshPayload = { userId: Number(user.id), type: 'refresh' }
    const newRefreshToken = jwt.sign(newRefreshPayload, JWT_REFRESH_SECRET(), { expiresIn: '30d' as any })

    await query('DELETE FROM auth_tokens WHERE token = $1 AND token_type = $2', [refreshToken, 'REFRESH_TOKEN'])
    await query('INSERT INTO auth_tokens (id, user_id, token_type, token) VALUES ($1, $2, $3, $4)',
      [nextSnowflake(), user.id, 'REFRESH_TOKEN', newRefreshToken])

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  },

  async revokeToken(token: string): Promise<void> {
    await query('DELETE FROM auth_tokens WHERE token = $1', [token])
  },

  async revokeAllUserTokens(userId: bigint): Promise<void> {
    await query('DELETE FROM auth_tokens WHERE user_id = $1', [userId])
  },

  async listTokens(userId: bigint): Promise<any[]> {
    const r = await query(`
      SELECT id, token_type, token, expires_at, created_at
      FROM auth_tokens WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [userId])
    return r.rows
  },
}
