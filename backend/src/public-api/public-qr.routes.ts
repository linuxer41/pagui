import { Elysia, t } from 'elysia'
import { qrService } from '../payments/qr/qr.service'
import { qrRepository } from '../payments/qr/qr.repository'
import { QRRequestSchema } from '../common/qr.schema'
import { authMiddleware } from '../shared/middleware/auth.middleware'
import { AppError } from '../shared/errors/app-error'
import { ok, list, fail } from '../shared/response'

export const publicQrRoutes = new Elysia({ prefix: '/qr' })
  .use(authMiddleware({ type: 'apikey', level: 'user' }))

  .post('/generate', async ({ body, auth }: any) => {
    const accountId = auth.apiKeyInfo.accountId
    const permissions = auth.apiKeyInfo.permissions
    if (!permissions.qr_generate) throw new AppError(403, 'API key no tiene permiso qr_generate')
    const qr = await qrService.generate({ ...body, accountId })
    return ok(qr, 'QR generado exitosamente')
  }, { body: QRRequestSchema, detail: { tags: ['Public QR'], summary: 'Generar QR (API key)' } })

  .get('/list', async ({ query, auth }: any) => {
    const permissions = auth.apiKeyInfo.permissions
    if (!permissions.qr_status) throw new AppError(403, 'API key no tiene permiso qr_status')
    const accountId = auth.apiKeyInfo.accountId
    const result = await qrService.list(accountId, {
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      status: query.status, from: query.from || query.startDate, to: query.to || query.endDate,
    })
    return list(result.qrs, result.totalCount, 'QR listados exitosamente')
  }, {
    query: t.Optional(t.Object({
      accountId: t.Optional(t.String()), page: t.Optional(t.String()),
      limit: t.Optional(t.String()), status: t.Optional(t.String()),
      from: t.Optional(t.String()), to: t.Optional(t.String()),
      startDate: t.Optional(t.String()), endDate: t.Optional(t.String()),
    })),
    detail: { tags: ['Public QR'], summary: 'Listar QR (API key)' },
  })

  .get('/:qrId', async ({ params }) => {
    const qr = await qrService.getDetails(params.qrId)
    if (!qr) throw new AppError(404, 'QR no encontrado')
    return ok(qr)
  }, {
    detail: { tags: ['Public QR'], summary: 'Detalle QR (API key)' },
  })

  .get('/:qrId/status', async ({ params, auth }: any) => {
    const permissions = auth.apiKeyInfo.permissions
    if (!permissions.qr_status) throw new AppError(403, 'API key no tiene permiso qr_status')
    const qr = await qrService.getDetails(params.qrId)
    if (!qr) throw new AppError(404, 'QR no encontrado')
    const payments = await qrService.getPayments(params.qrId)
    return ok({ ...qr, payments }, 'Estado del QR verificado')
  }, {
    detail: { tags: ['Public QR'], summary: 'Estado QR (API key)' },
  })

  .get('/:qrId/payments', async ({ params }) => {
    const payments = await qrService.getPayments(params.qrId)
    return list(payments, undefined, 'Pagos listados exitosamente')
  }, {
    detail: { tags: ['Public QR'], summary: 'Pagos QR (API key)' },
  })

  .delete('/cancelQR', async ({ body, auth }: any) => {
    const permissions = auth.apiKeyInfo.permissions
    if (!permissions.qr_cancel) throw new AppError(403, 'API key no tiene permiso qr_cancel')
    await qrService.cancel(body.qrId)
    return ok({ qrId: body.qrId }, 'QR cancelado exitosamente')
  }, {
    detail: { tags: ['Public QR'], summary: 'Cancelar QR por body (API key)' },
  })

  .delete('/:qrId', async ({ params, auth }: any) => {
    const permissions = auth.apiKeyInfo.permissions
    if (!permissions.qr_cancel) throw new AppError(403, 'API key no tiene permiso qr_cancel')
    await qrService.cancel(params.qrId)
    return ok({ qrId: params.qrId }, 'QR cancelado exitosamente')
  }, {
    detail: { tags: ['Public QR'], summary: 'Cancelar QR por ID (API key)' },
  })
