import { Elysia, t } from 'elysia'
import { apiKeyService } from './apikey.service'
import { authMiddleware } from '../shared/middleware/auth.middleware'

export const apiKeyRoutes = new Elysia({ prefix: '/apikeys' })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .post('/', async ({ body, auth }: any) => {
    return apiKeyService.generate(auth.user.id, body.description, body.permissions, body.expiresAt)
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
  })

  .get('/', async ({ auth }: any) => {
    return apiKeyService.list(auth.user.id)
  })

  .delete('/:id', async ({ params }) => {
    await apiKeyService.revoke(BigInt(params.id))
    return { message: 'API key revocada' }
  })
