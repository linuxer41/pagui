import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { createSubscription, cancelSubscription, listSubscriptions } from './subscription.service'

export const subscriptionRoutes = new Elysia({ prefix: '/subscriptions' })
  .derive(authMiddleware)
  .get('/', async ({ userId }) => {
    return await listSubscriptions(userId)
  }, {
    detail: { tags: ['Subscriptions'], summary: 'Listar suscripciones' },
  })
  .post('/', async ({ userId, body }) => {
    return await createSubscription({ userId, ...body })
  }, {
    body: t.Object({
      walletId: t.String(),
      receiverWalletId: t.String(),
      amount: t.Number({ minimum: 0.01 }),
      description: t.Optional(t.String()),
      interval: t.Enum({ daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' }),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
      maxPayments: t.Optional(t.Number()),
    }),
    detail: { tags: ['Subscriptions'], summary: 'Crear suscripción de pago' },
  })
  .post('/:id/cancel', async ({ params }) => {
    await cancelSubscription(params.id)
    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Subscriptions'], summary: 'Cancelar suscripción' },
  })
