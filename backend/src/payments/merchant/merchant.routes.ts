import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { registerMerchant, processMerchantPayment, generateMerchantQR, listMerchants, getMerchantById } from './merchant.service'
import { ok, list } from '../../shared/response'
import { AppError } from '../../shared/errors/app-error'

export const merchantRoutes = new Elysia({ prefix: '/merchants' })
  .derive(authMiddleware)
  .get('/', async ({ userId }) => {
    const merchants = await listMerchants(userId)
    return list(merchants, undefined, 'Comercios listados exitosamente')
  }, {
    detail: { tags: ['Merchant'], summary: 'Listar mis comercios' },
  })
  .get('/:id', async ({ params }) => {
    const merchant = await getMerchantById(params.id)
    if (!merchant) throw new AppError(404, 'Comercio no encontrado')
    return ok(merchant)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Merchant'], summary: 'Detalle de comercio' },
  })
  .post('/register', async ({ userId, body }) => {
    return ok(await registerMerchant({ userId, ...body }))
  }, {
    body: t.Object({
      businessName: t.String({ minLength: 3 }),
      businessCategory: t.String(),
      taxId: t.String(),
      phone: t.String(),
      address: t.Optional(t.String()),
      commissionRate: t.Optional(t.Number()),
    }),
    detail: { tags: ['Merchant'], summary: 'Registrar comercio' },
  })
  .get('/:id/qr', async ({ params }) => {
    return ok(await generateMerchantQR(params.id))
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Merchant'], summary: 'Generar QR de comercio' },
  })
  .post('/pay', async ({ body }) => {
    return ok(await processMerchantPayment(body))
  }, {
    body: t.Object({
      merchantId: t.String(),
      customerWalletId: t.String(),
      amount: t.Number({ minimum: 0.01 }),
      description: t.Optional(t.String()),
    }),
    detail: { tags: ['Merchant'], summary: 'Pagar en comercio' },
  })
