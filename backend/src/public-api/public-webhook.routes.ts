import { Elysia, t } from 'elysia'
import {
  registerWebhook,
  getWebhooks,
  deleteWebhook,
  ownerUserIdForWallet,
  type WebhookEvent,
} from '../payments/webhooks/webhook.service'
import { walletRepository } from '../banking/wallet/wallet.repository'
import { authMiddleware } from '../shared/middleware/auth.middleware'
import { AppError } from '../shared/errors/app-error'
import { ok, list } from '../shared/response'

// Webhooks por API key: la billetera la da la propia clave, así el comercio puede
// suscribirse sin credenciales de usuario (el panel web usa rutas con JWT).
export const publicWebhookRoutes = new Elysia({ prefix: '/webhooks' })
  .derive(authMiddleware({ type: 'apikey', level: 'user' }))
  .derive(async ({ auth }: any) => {
    const permissions = auth.apiKeyInfo.permissions
    if (!permissions.qr_generate) throw new AppError(403, 'API key no tiene permiso qr_generate')
    const walletId = BigInt(auth.apiKeyInfo.walletId)
    const userId = await ownerUserIdForWallet(walletId)
    if (!userId) throw new AppError(403, 'La billetera de esta API key no tiene propietario')
    const wallet = await walletRepository.getCollectionById(userId, walletId)
    if (!wallet) throw new AppError(400, 'La billetera no existe o no es de recaudación')
    return { webhookScope: { userId, walletId } }
  })

  .get('/', async ({ webhookScope }: any) => {
    const webhooks = await getWebhooks(webhookScope.userId, webhookScope.walletId)
    return list(webhooks, undefined, 'Webhooks listados exitosamente')
  }, {
    detail: { tags: ['Public Webhooks'], summary: 'Listar webhooks de la billetera (API key)' },
  })

  .post('/', async ({ body, webhookScope }: any) => {
    const { id } = await registerWebhook({
      userId: webhookScope.userId,
      walletId: webhookScope.walletId,
      url: body.url,
      events: body.events as WebhookEvent[],
    })
    return ok({ id }, 'Webhook registrado exitosamente')
  }, {
    body: t.Object({
      url: t.String({ format: 'uri' }),
      events: t.Array(t.String()),
    }),
    detail: { tags: ['Public Webhooks'], summary: 'Registrar webhook de la billetera (API key)' },
  })

  .delete('/:id', async ({ params, webhookScope }: any) => {
    await deleteWebhook(params.id, webhookScope.userId, webhookScope.walletId)
    return ok(null, 'Webhook eliminado')
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Public Webhooks'], summary: 'Eliminar webhook de la billetera (API key)' },
  })
