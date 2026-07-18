import { Elysia, t } from 'elysia'
import { authService } from './auth.service'
import { userService } from './user.service'
import { otpService } from './otp.service'
import { authMiddleware } from '../shared/middleware/auth.middleware'
import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'
import { hash, encrypt, decrypt } from '../shared/crypto'
import { logger } from '../shared/logger'
import { ok, list, fail } from '../shared/response'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, set }) => {
    try {
      return ok(await authService.login(body.email, body.password))
    } catch (e: any) {
      if (e.statusCode) {
        set.status = e.statusCode
        return fail(e.message, e.message)
      }
      throw e
    }
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
    if (result.rows.length === 0) { set.status = 401; return fail('Credencial biométrica no válida', 'Credencial biométrica no válida') }
    const user = result.rows[0]
    if (!user.is_active) { set.status = 401; return fail('Usuario inactivo', 'Usuario inactivo') }
    return ok(await authService.generateTokens(user.id))
  }, {
    body: t.Object({ biometricKeyHash: t.String() }),
    detail: { tags: ['Auth'], summary: 'Inicio de sesión biométrico' },
  })

  .post('/refresh', async ({ body }) => {
    return ok(await authService.refreshAccessToken(body.refreshToken))
  }, {
    body: t.Object({ refreshToken: t.String() }),
    detail: { tags: ['Auth'], summary: 'Refrescar token' },
  })

  .post('/forgot-password', async ({ body }) => {
    await otpService.sendOTP(body.email)
    return ok(null, 'Si el email existe, recibirá instrucciones')
  }, {
    body: t.Object({ email: t.String() }),
    detail: { tags: ['Auth'], summary: 'Recuperar contraseña' },
  })

  .post('/register', async ({ body, set }) => {
    try {
      const exists = await query('SELECT id FROM registration_requests WHERE email = $1', [body.email])
      if (exists.rows.length > 0) {
        set.status = 409
        return fail('Ya existe una solicitud con este email', 'Ya existe una solicitud con este email')
      }
      const id = nextSnowflake()
      await query(
        `INSERT INTO registration_requests (id, full_name, email, company, phone, message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, body.fullName, body.email, body.company, body.phone, body.message || '']
      )
      return ok({ id: id.toString() }, 'Solicitud enviada exitosamente')
    } catch (e: any) {
      if (e.statusCode) { set.status = e.statusCode; return fail(e.message, e.message) }
      throw e
    }
  }, {
    body: t.Object({
      fullName: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' }),
      company: t.String({ minLength: 1 }),
      phone: t.String({ minLength: 1 }),
      message: t.Optional(t.String()),
    }),
    detail: { tags: ['Auth'], summary: 'Solicitar registro de cuenta' },
  })
  .post('/otp/login', async ({ body }) => {
    return ok(await authService.loginWithOTP(body.phone, body.code))
  }, {
    body: t.Object({
      phone: t.String({ minLength: 1 }),
      code: t.String({ minLength: 6 }),
    }),
    detail: { tags: ['Auth'], summary: 'Iniciar sesión con OTP' },
  })

  .post('/otp/complete', async ({ body }) => {
    return ok(await authService.completeRegistration(body.phone, body.name, body.documentId, body.tempToken))
  }, {
    body: t.Object({
      phone: t.String({ minLength: 1 }),
      name: t.String({ minLength: 1 }),
      documentId: t.String({ minLength: 1 }),
      tempToken: t.String({ minLength: 1 }),
    }),
    detail: { tags: ['Auth'], summary: 'Completar registro con nombre y carnet' },
  })

  .post('/send-otp', async ({ body }) => {
    await otpService.sendOTP(body.phone)
    return ok(null, 'OTP enviado por WhatsApp')
  }, {
    body: t.Object({ phone: t.String() }),
    detail: { tags: ['Auth'], summary: 'Enviar OTP' },
  })

  .post('/verify-otp', async ({ body }) => {
    await otpService.verifyOTP(body.phone, body.code)
    return ok(null, 'OTP verificado')
  }, {
    body: t.Object({ phone: t.String(), code: t.String() }),
    detail: { tags: ['Auth'], summary: 'Verificar OTP' },
  })

  .derive(authMiddleware({ type: 'jwt', level: 'user' }))

  .get('/tokens', async ({ auth }: any) => {
    const tokens = await authService.listTokens(auth.user.id)
    return list(tokens, undefined, 'Tokens listados exitosamente')
  }, {
    detail: { tags: ['Auth'], summary: 'Listar tokens activos' },
  })

  .post('/revoke-token/:tokenId', async ({ params, auth }: any) => {
    await authService.revokeToken(params.tokenId)
    return ok(null, 'Token revocado')
  }, {
    detail: { tags: ['Auth'], summary: 'Revocar token específico' },
  })

  .post('/revoke-all', async ({ auth }: any) => {
    await authService.revokeAllUserTokens(auth.user.id)
    return ok(null, 'Todos los tokens revocados')
  }, {
    detail: { tags: ['Auth'], summary: 'Revocar todos los tokens' },
  })

  .post('/change-password', async ({ body, auth }: any) => {
    await userService.changePassword(auth.user.id, body.newPassword)
    return ok(null, 'Contraseña actualizada')
  }, {
    body: t.Object({ newPassword: t.String({ minLength: 6 }) }),
    detail: { tags: ['Auth'], summary: 'Cambiar contraseña' },
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
    return ok({ deviceId: result.rows[0].id }, 'Credencial biométrica registrada')
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
    return ok(null, 'Credencial biométrica eliminada')
  }, {
    params: t.Object({ deviceId: t.String() }),
    detail: { tags: ['Auth'], summary: 'Eliminar credencial biométrica' },
  })
