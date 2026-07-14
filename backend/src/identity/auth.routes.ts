import { Elysia, t } from 'elysia'
import { authService } from './auth.service'
import { userService } from './user.service'
import { otpService } from './otp.service'
import { authMiddleware } from '../shared/middleware/auth.middleware'
import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'
import { hash, encrypt, decrypt } from '../shared/crypto'
import { logger } from '../shared/logger'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body }) => {
    return authService.login(body.email, body.password)
  }, {
    body: t.Object({ email: t.String(), password: t.String() }),
    detail: { tags: ['Auth'], summary: 'Iniciar sesión' },
  })

  .post('/biometric/login', async ({ body }) => {
    const result = await query(
      `SELECT u.id, u.password_hash, u.is_active FROM users u
       JOIN devices d ON d.user_id = u.id
       WHERE d.biometric_key_hash = $1 AND d.is_active = TRUE
       LIMIT 1`,
      [body.biometricKeyHash]
    )
    if (result.rows.length === 0) throw new Error('Credencial biométrica no válida')
    const user = result.rows[0]
    if (!user.is_active) throw new Error('Usuario inactivo')
    return authService.generateTokens(user.id)
  }, {
    body: t.Object({ biometricKeyHash: t.String() }),
    detail: { tags: ['Auth'], summary: 'Inicio de sesión biométrico' },
  })

  .post('/refresh', async ({ body }) => {
    return authService.refreshAccessToken(body.refreshToken)
  }, {
    body: t.Object({ refreshToken: t.String() }),
    detail: { tags: ['Auth'], summary: 'Refrescar token' },
  })

  .post('/forgot-password', async ({ body }) => {
    await otpService.sendOTP(body.email)
    return { message: 'Si el email existe, recibirá instrucciones' }
  }, {
    body: t.Object({ email: t.String() }),
    detail: { tags: ['Auth'], summary: 'Recuperar contraseña' },
  })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .get('/tokens', async ({ auth }: any) => {
    return authService.listTokens(auth.user.id)
  })

  .post('/revoke-token/:tokenId', async ({ params, auth }: any) => {
    await authService.revokeToken(params.tokenId)
    return { message: 'Token revocado' }
  })

  .post('/revoke-all', async ({ auth }: any) => {
    await authService.revokeAllUserTokens(auth.user.id)
    return { message: 'Todos los tokens revocados' }
  })

  .post('/change-password', async ({ body, auth }: any) => {
    await userService.changePassword(auth.user.id, body.newPassword)
    return { message: 'Contraseña actualizada' }
  }, {
    body: t.Object({ newPassword: t.String({ minLength: 6 }) }),
  })

  .post('/send-otp', async ({ body }) => {
    await otpService.sendOTP(body.phone)
    return { message: 'OTP enviado' }
  }, {
    body: t.Object({ phone: t.String() }),
  })

  .post('/verify-otp', async ({ body }) => {
    await otpService.verifyOTP(body.phone, body.code)
    return { message: 'OTP verificado' }
  }, {
    body: t.Object({ phone: t.String(), code: t.String() }),
  })

  .post('/biometric/register', async ({ body, auth }: any) => {
    const keyHash = hash(body.biometricKey)
    const encryptedKey = encrypt(body.biometricKey)
    const deviceData = body.deviceName
      ? { name: body.deviceName, platform: body.platform || 'unknown' }
      : {}

    const result = await query(
      `INSERT INTO devices (id, user_id, name, platform, biometric_key_hash, encrypted_biometric_key, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id`,
      [nextSnowflake(), auth.user.id, deviceData.name || null, deviceData.platform || null, keyHash, encryptedKey]
    )

    logger.info('Biometric key registered', { userId: auth.user.id, deviceId: result.rows[0].id })
    return { deviceId: result.rows[0].id, message: 'Credencial biométrica registrada' }
  }, {
    body: t.Object({
      biometricKey: t.String(),
      deviceName: t.Optional(t.String()),
      platform: t.Optional(t.String()),
    }),
    detail: { tags: ['Auth'], summary: 'Registrar credencial biométrica' },
  })

  .post('/biometric/unregister/:deviceId', async ({ params, auth }: any) => {
    await query(
      'UPDATE devices SET is_active = FALSE, biometric_key_hash = NULL, encrypted_biometric_key = NULL WHERE id = $1 AND user_id = $2',
      [params.deviceId, auth.user.id]
    )
    return { message: 'Credencial biométrica eliminada' }
  }, {
    params: t.Object({ deviceId: t.String() }),
    detail: { tags: ['Auth'], summary: 'Eliminar credencial biométrica' },
  })
