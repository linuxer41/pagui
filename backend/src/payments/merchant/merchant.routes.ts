import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { registerMerchant, processMerchantPayment, generateMerchantQR } from './merchant.service'

export const merchantRoutes = new Elysia({ prefix: '/merchants' })
  .derive(authMiddleware)
  .post('/register', async ({ userId, body }) => {
    return await registerMerchant({ userId, ...body })
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
    return await generateMerchantQR(params.id)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Merchant'], summary: 'Generar QR de comercio' },
  })
  .post('/pay', async ({ body }) => {
    return await processMerchantPayment(body)
  }, {
    body: t.Object({
      merchantId: t.String(),
      customerWalletId: t.String(),
      amount: t.Number({ minimum: 0.01 }),
      description: t.Optional(t.String()),
    }),
    detail: { tags: ['Merchant'], summary: 'Pagar en comercio' },
  })
