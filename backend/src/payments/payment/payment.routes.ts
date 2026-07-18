import { Elysia, t } from 'elysia'

import { idempotency } from '../../shared/middleware/idempotency'
import { transferService } from '../transfer/transfer.service'
import { query } from '../../shared/database/pool'
import { notifRepository } from '../notification/notif.repository'
import { walletRepository } from '../../banking/wallet/wallet.repository'
import { ok, list } from '../../shared/response'
import { AppError } from '../../shared/errors/app-error'
import { nextSnowflake } from '../../shared/snowflake'

export const paymentRoutes = new Elysia()
  .use(idempotency())

  .post('/transfers/p2p', async ({ body, auth, request, idempotencyKey }: any) => {
    const wallets = await walletRepository.listByUser(auth.user.id)
    const senderWallet = body.senderWalletId
      ? wallets.find(w => String(w.id) === body.senderWalletId)
      : wallets.find(w => w.type === 'standard')
    if (!senderWallet) throw new AppError(404, 'Billetera origen no encontrada')
    const receiverWallet = await walletRepository.getByWalletNumber(body.receiverWalletNumber)
    if (!receiverWallet) throw new AppError(404, 'Billetera destino no encontrada')
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || ''
    const deviceId = request.headers.get('x-device-id') || undefined
    return ok(await transferService.p2p(senderWallet.id, receiverWallet.id, body.amount, {
      description: body.description,
      idempotencyKey,
      ip,
      deviceId,
      userId: auth.user.id,
    }))
  }, {
    body: t.Object({
      receiverWalletNumber: t.String(),
      amount: t.Number({ minimum: 0.01 }),
      description: t.Optional(t.String()),
      senderWalletId: t.Optional(t.String()),
    }),
    detail: { tags: ['Payments'], summary: 'Transferencia P2P' },
  })

  .get('/transfers', async ({ query: q, auth }: any) => {
    let walletId = q.walletId ? BigInt(q.walletId) : null
    if (!walletId) {
      const wallets = await walletRepository.listByUser(auth.user.id)
      walletId = wallets.length > 0 ? wallets[0].id : null
    }
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
    const r = await query(`
      INSERT INTO wallets (id, name, type, currency, balance, available_balance, held_balance)
      VALUES ($1, $2, $3, $4, 0, 0, 0)
      RETURNING *
    `, [nextSnowflake(), body.name || 'Principal', body.type || 'standard', body.currency || 'BOB'])
    return ok(r.rows[0], 'Billetera creada exitosamente')
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

