import { Elysia } from 'elysia'
import { Role } from '@pagui/shared'
import { authService } from '../../identity/auth.service'
import { apiKeyService } from '../../api-keys/apikey.service'
import { AppError } from '../errors/app-error'

export async function verifyToken(token: string): Promise<{ userId: string; email: string; role: number }> {
  const { default: jwt } = await import('jsonwebtoken')
  const secret = process.env.JWT_SECRET || 'default-secret'
  const decoded = jwt.verify(token, secret) as any
  return { userId: decoded.userId || decoded.sub, email: decoded.email, role: decoded.role ?? Role.User }
}

export function requireRole(...roles: Role[]) {
  return (auth: { user: { role: number } }): void => {
    if (!roles.includes(auth.user.role)) {
      throw new AppError(403, 'No tienes permisos para realizar esta acción')
    }
  }
}

interface JWTAuthData {
  type: 'jwt'
  user: { id: bigint; email: string; role: number }
}

interface APIKeyAuthData {
  type: 'apikey'
  apiKeyInfo: {
    accountId: bigint
    bankCredentialId: bigint | null
    permissions: Record<string, boolean>
    apiKey: string
  }
}

type AuthData = JWTAuthData | APIKeyAuthData

export function authMiddleware<T extends 'jwt' | 'apikey' | 'all'>(
  options: { type: T; level: 'user' | 'admin' } = { type: 'jwt' as T, level: 'user' }
) {
  type ReturnType =
    T extends 'jwt' ? { auth: JWTAuthData } :
    T extends 'apikey' ? { auth: APIKeyAuthData } :
    { auth: AuthData }

  return new Elysia({ name: 'auth' })
    .derive({ as: 'scoped' }, async (ctx): Promise<ReturnType> => {
      const authHeader = ctx.headers.authorization
      const apiKeyHeader = ctx.headers['x-api-key']

      if (authHeader?.startsWith('Bearer ') && (options.type === 'jwt' || options.type === 'all')) {
        const token = authHeader.substring(7)
        try {
          const decoded = await authService.verifyTokenWithDb(token)
          const userInfo = await authService.getUserInfo(decoded.email)
          if (!userInfo) throw new AppError(401, 'Usuario no encontrado')
          if (options.level === 'admin' && userInfo.role !== Role.Admin && userInfo.role !== Role.Super) {
            throw new AppError(403, 'Se requiere rol de administrador')
          }
          return { auth: { type: 'jwt' as const, user: userInfo as { id: bigint; email: string; role: number } } } as ReturnType
        } catch (err) {
          if (err instanceof AppError) throw err
          throw new AppError(401, 'Error en autenticación')
        }
      }

      if (apiKeyHeader && (options.type === 'apikey' || options.type === 'all')) {
        const verification = await apiKeyService.verifyApiKey(apiKeyHeader)
        if (verification.isValid && verification.accountId) {
          if (options.level === 'admin' && !verification.permissions?.qr_generate) {
            throw new AppError(403, 'Se requieren permisos de administrador')
          }
          return {
            auth: {
              type: 'apikey' as const,
              apiKeyInfo: {
                accountId: verification.accountId,
                bankCredentialId: verification.bankCredentialId || null,
                permissions: verification.permissions || {},
                apiKey: apiKeyHeader,
              },
            },
          } as ReturnType
        }
        throw new AppError(401, 'API key inválida')
      }

      const msg = options.type === 'jwt' ? 'JWT requerida' :
                  options.type === 'apikey' ? 'API key requerida' :
                  'Autenticación requerida'
      throw new AppError(401, msg)
    })
}
