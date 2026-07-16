import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { registerWebhook, getWebhooks, deleteWebhook } from './webhook.service'
import { AppError } from '../../shared/errors/app-error'
import { ok, list } from '../../shared/response'

export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
  .derive(authMiddleware)
  .get('/', async ({ userId }) => {
    const webhooks = await getWebhooks(userId)
    return list(webhooks, undefined, 'Webhooks listados exitosamente')
  }, {
    detail: { tags: ['Webhooks'], summary: 'Listar webhooks del usuario' },
  })
  .post('/', async ({ userId, body }) => {
    const id = await registerWebhook({
      userId,
      url: body.url,
      secret: body.secret,
      events: body.events,
      companyId: body.companyId,
    })
    return ok({ id })
  }, {
    body: t.Object({
      url: t.String({ format: 'uri' }),
      secret: t.Optional(t.String()),
      events: t.Array(t.String()),
      companyId: t.Optional(t.String()),
    }),
    detail: { tags: ['Webhooks'], summary: 'Registrar nuevo webhook' },
  })
  .delete('/:id', async ({ params, userId }) => {
    await deleteWebhook(params.id, userId)
    return ok(null)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Webhooks'], summary: 'Eliminar webhook' },
  })
