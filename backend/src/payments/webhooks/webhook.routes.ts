import { Elysia, t } from 'elysia'
import { registerWebhook, getWebhooks, deleteWebhook } from './webhook.service'
import { walletRepository } from '../../banking/wallet/wallet.repository'
import { AppError } from '../../shared/errors/app-error'
import { ok, list } from '../../shared/response'

export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
  .get('/', async ({ auth, query: q }) => {
    const userId = auth.user.id
    const walletIdStr = (q as any).walletId as string | undefined
    if (!walletIdStr) throw new AppError(400, 'walletId es requerido')
    const wallet = await walletRepository.getCollectionById(userId, BigInt(walletIdStr))
    if (!wallet) throw new AppError(400, 'La billetera no existe o no es de recaudación')
    const webhooks = await getWebhooks(userId, BigInt(walletIdStr))
    return list(webhooks, undefined, 'Webhooks listados exitosamente')
  }, {
    detail: { tags: ['Webhooks'], summary: 'Listar webhooks de la billetera de recaudación' },
  })

  .post('/', async ({ auth, body }) => {
    const userId = auth.user.id
    const wallet = await walletRepository.getCollectionById(userId, BigInt(body.walletId))
    if (!wallet) throw new AppError(400, 'La billetera no existe o no es de recaudación')
    const { id } = await registerWebhook({
      userId,
      walletId: BigInt(body.walletId),
      url: body.url,
      events: body.events,
    })
    return ok({ id })
  }, {
    body: t.Object({
      walletId: t.String(),
      url: t.String({ format: 'uri' }),
      events: t.Array(t.String()),
    }),
    detail: { tags: ['Webhooks'], summary: 'Registrar nuevo webhook para billetera de recaudación' },
  })

  .delete('/:id', async ({ params, auth, query: q }) => {
    const userId = auth.user.id
    const walletIdStr = (q as any).walletId as string | undefined
    if (!walletIdStr) throw new AppError(400, 'walletId es requerido')
    const wallet = await walletRepository.getCollectionById(userId, BigInt(walletIdStr))
    if (!wallet) throw new AppError(400, 'La billetera no existe o no es de recaudación')
    await deleteWebhook(params.id, userId, BigInt(walletIdStr))
    return ok(null)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Webhooks'], summary: 'Eliminar webhook de billetera de recaudación' },
  })
