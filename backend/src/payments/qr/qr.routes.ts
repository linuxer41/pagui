import { Elysia, t } from 'elysia'
import { qrService } from './qr.service'
import { qrRepository } from './qr.repository'
import { QRRequestSchema } from '../../common/qr.schema'

import { walletRepository } from '../../banking/wallet/wallet.repository'
import { AppError } from '../../shared/errors/app-error'
import { ok, list } from '../../shared/response'

export const qrRoutes = new Elysia({ prefix: '/qr' })

  .post('/generate', async ({ body, auth }: any) => {
    const walletId = body.walletId ? BigInt(body.walletId) : undefined
    const qr = await qrService.generate({ ...body, walletId, userId: auth.user.id })
    return ok(qr, 'QR generado exitosamente')
  }, { body: QRRequestSchema, detail: { tags: ['QR'], summary: 'Generar QR de pago' } })

  .get('/list', async ({ query, auth }: any) => {
    const result = await qrService.listByUser(auth.user.id, {
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      status: query.status,
    })
    return list(result.qrs, result.totalCount, 'QR listados exitosamente')
  }, {
    query: t.Optional(t.Object({
      walletId: t.Optional(t.String()), page: t.Optional(t.String()),
      limit: t.Optional(t.String()), status: t.Optional(t.String()),
      from: t.Optional(t.String()), to: t.Optional(t.String()),
      startDate: t.Optional(t.String()), endDate: t.Optional(t.String()),
    })),
    detail: { tags: ['QR'], summary: 'Listar QR generados' },
  })

  .get('/:qrId', async ({ params }) => {
    const qr = await qrService.getDetails(params.qrId)
    if (!qr) throw new AppError(404, 'QR no encontrado')
    return ok(qr)
  }, {
    detail: { tags: ['QR'], summary: 'Obtener detalle de QR' },
  })

  .get('/:qrId/status', async ({ params }) => {
    const qr = await qrService.getDetails(params.qrId)
    if (!qr) throw new AppError(404, 'QR no encontrado')
    const payments = await qrService.getPayments(params.qrId)
    return ok({ ...qr, payments }, 'Estado del QR verificado')
  }, {
    detail: { tags: ['QR'], summary: 'Verificar estado de QR' },
  })

  .get('/:qrId/payments', async ({ params }) => {
    const payments = await qrService.getPayments(params.qrId)
    return list(payments, undefined, 'Pagos listados exitosamente')
  }, {
    detail: { tags: ['QR'], summary: 'Listar pagos de un QR' },
  })

  .delete('/cancelQR', async ({ body }: any) => {
    await qrService.cancel(body.qrId)
    return ok({ qrId: body.qrId }, 'QR cancelado exitosamente')
  }, {
    detail: { tags: ['QR'], summary: 'Cancelar QR por body' },
  })

  .delete('/:qrId', async ({ params }) => {
    await qrService.cancel(params.qrId)
    return ok({ qrId: params.qrId }, 'QR cancelado exitosamente')
  }, {
    detail: { tags: ['QR'], summary: 'Cancelar QR por ID' },
  })
