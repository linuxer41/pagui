import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { idempotency } from '../../shared/middleware/idempotency'
import { transferService } from '../transfer/transfer.service'
import { walletRepository } from '../wallet/wallet.repository'
import { notifRepository } from '../notification/notif.repository'
import { feeService } from '../fee/fee.service'
import { ok, list } from '../../shared/response'
import { AppError } from '../../shared/errors/app-error'

export const paymentRoutes = new Elysia()
  .use(authMiddleware({ type: 'jwt', level: 'user' }))
  .use(idempotency())

  .post('/transfers/p2p', async ({ body, auth, request, idempotencyKey }: any) => {
    const senderWallet = await walletRepository.getDefault(auth.user.id)
    if (!senderWallet) throw new AppError(404, 'Billetera no encontrada')
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || ''
    const deviceId = request.headers.get('x-device-id') || undefined
    return ok(await transferService.p2p(senderWallet.id, BigInt(body.receiverWalletId), body.amount, {
      description: body.description,
      idempotencyKey,
      ip,
      deviceId,
      userId: auth.user.id,
    }))
  }, {
    body: t.Object({
      receiverWalletId: t.String(),
      amount: t.Number({ minimum: 0.01 }),
      description: t.Optional(t.String()),
    }),
    detail: { tags: ['Payments'], summary: 'Transferencia P2P' },
  })

  .get('/transfers', async ({ query, auth }: any) => {
    const walletId = query.walletId ? BigInt(query.walletId) : (await walletRepository.getDefault(auth.user.id))?.id
    if (!walletId) throw new AppError(404, 'Billetera no encontrada')
    const transfers = await transferService.listByWallet(walletId)
    return list(transfers, undefined, 'Transferencias listadas exitosamente')
  }, {
    query: t.Optional(t.Object({ walletId: t.Optional(t.String()) })),
    detail: { tags: ['Payments'], summary: 'Historial de transferencias' },
  })

  .get('/wallets', async ({ auth }: any) => {
    const wallets = await walletRepository.listByUser(auth.user.id)
    return list(wallets, undefined, 'Billeteras listadas exitosamente')
  }, {
    detail: { tags: ['Payments'], summary: 'Listar billeteras' },
  })

  .get('/wallets/:id', async ({ params }: any) => {
    const wallet = await walletRepository.getById(BigInt(params.id))
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    return ok(wallet)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Payments'], summary: 'Detalle de billetera' },
  })

  .post('/wallets', async ({ body, auth }: any) => {
    return ok(await walletRepository.create({ userId: auth.user.id, ...body }))
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      type: t.Optional(t.String()),
      currency: t.Optional(t.String()),
    }),
    detail: { tags: ['Payments'], summary: 'Crear billetera' },
  })

  .get('/notifications', async ({ auth }: any) => {
    const notifications = await notifRepository.listByUser(auth.user.id)
    return list(notifications, undefined, 'Notificaciones listadas exitosamente')
  }, {
    detail: { tags: ['Payments'], summary: 'Listar notificaciones' },
  })

  .post('/notifications/:id/read', async ({ params }: any) => {
    await notifRepository.markRead(BigInt(params.id))
    return ok(null, 'Notificación marcada como leída')
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Payments'], summary: 'Marcar notificación como leída' },
  })

  .post('/notifications/read-all', async ({ auth }: any) => {
    await notifRepository.markAllRead(auth.user.id)
    return ok(null, 'Todas marcadas como leídas')
  }, {
    detail: { tags: ['Payments'], summary: 'Marcar todas como leídas' },
  })

  .get('/notifications/unread-count', async ({ auth }: any) => {
    return ok({ count: await notifRepository.countUnread(auth.user.id) })
  }, {
    detail: { tags: ['Payments'], summary: 'Contar no leídas' },
  })

  .get('/fees', async () => {
    const fees = await feeService.listAll()
    return list(fees, undefined, 'Comisiones listadas exitosamente')
  }, {
    detail: { tags: ['Payments'], summary: 'Listar reglas de comisiones' },
  })
