import { Elysia, t } from 'elysia'
import { apiKeyService } from './apikey.service'
import { authMiddleware } from '../shared/middleware/auth.middleware'
import { accountRepository } from '../banking/account/account.repository'
import { AppError } from '../shared/errors/app-error'
import { ok, list } from '../shared/response'

export const apiKeyRoutes = new Elysia({ prefix: '/apikeys' })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .post('/', async ({ body, auth }: any) => {
    const accounts = await accountRepository.listByUser(auth.user.id)
    if (accounts.length === 0) throw new AppError(400, 'El usuario no tiene cuentas')
    const accountId = accounts[0].id
    const key = await apiKeyService.generate(accountId, body.description, body.permissions, body.expiresAt)
    return ok(key, 'API key creada exitosamente')
  }, {
    body: t.Object({
      description: t.String(),
      permissions: t.Object({
        qr_generate: t.Optional(t.Boolean()),
        qr_status: t.Optional(t.Boolean()),
        qr_cancel: t.Optional(t.Boolean()),
      }),
      expiresAt: t.Optional(t.String()),
    }),
    detail: { tags: ['API Keys'], summary: 'Crear API key' },
  })

  .get('/', async ({ auth }: any) => {
    const accounts = await accountRepository.listByUser(auth.user.id)
    if (accounts.length === 0) throw new AppError(400, 'El usuario no tiene cuentas')
    const accountId = accounts[0].id
    const keys = await apiKeyService.list(accountId)
    return list(keys, undefined, 'API keys listadas exitosamente')
  }, {
    detail: { tags: ['API Keys'], summary: 'Listar API keys' },
  })

  .delete('/:id', async ({ params }) => {
    await apiKeyService.revoke(BigInt(params.id))
    return ok({ id: params.id }, 'API key revocada exitosamente')
  }, {
    detail: { tags: ['API Keys'], summary: 'Revocar API key' },
  })
