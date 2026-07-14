import { Elysia, t } from 'elysia'
import { qrService } from './qr.service'
import { qrRepository } from './qr.repository'
import { QRRequestSchema } from '../../common/qr.schema'
import { authMiddleware } from '../../shared/middleware/auth.middleware'

export const qrRoutes = new Elysia({ prefix: '/qr' })
  .use(authMiddleware({ type: 'all', level: 'user' }))

  .post('/generate', async ({ body, auth }: any) => {
    const accountId = auth.type === 'jwt'
      ? BigInt(body.accountId || 0)
      : auth.apiKeyInfo.accountId
    return qrService.generate({ ...body, accountId })
  }, { body: QRRequestSchema })

  .get('/list', async ({ query, auth }: any) => {
    const accountId = auth.type === 'jwt' ? BigInt(query.accountId || 0) : auth.apiKeyInfo.accountId
    return qrService.list(accountId, {
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      status: query.status, from: query.from, to: query.to,
    })
  }, {
    query: t.Optional(t.Object({
      accountId: t.Optional(t.String()), page: t.Optional(t.String()),
      limit: t.Optional(t.String()), status: t.Optional(t.String()),
      from: t.Optional(t.String()), to: t.Optional(t.String()),
    })),
  })

  .get('/:qrId', async ({ params }) => {
    const qr = await qrService.getDetails(params.qrId)
    if (!qr) throw new Error('QR no encontrado')
    return qr
  })

  .get('/:qrId/payments', async ({ params }) => {
    return qrService.getPayments(params.qrId)
  })

  .delete('/:qrId', async ({ params }) => {
    await qrService.cancel(params.qrId)
    return { message: 'QR cancelado' }
  })
