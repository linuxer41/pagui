import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { createSplitPayment, calculateSplit } from './split.service'
import { AppError } from '../../shared/errors/app-error'
import { ok } from '../../shared/response'

export const splitRoutes = new Elysia({ prefix: '/split' })
  .derive(authMiddleware)
  .post('/pay', async ({ body }) => {
    return ok(await createSplitPayment(body.senderWalletId, body.recipients, body.description))
  }, {
    body: t.Object({
      senderWalletId: t.String(),
      recipients: t.Array(t.Object({
        walletId: t.String(),
        amount: t.Number({ minimum: 0.01 }),
        percentage: t.Number({ minimum: 0.01 }),
      })),
      description: t.Optional(t.String()),
    }),
    detail: { tags: ['Split'], summary: 'Pago compartido múltiple' },
  })
  .post('/calculate', async ({ body }) => {
    try {
      const items = calculateSplit(body.total, body.percentages)
      return ok({ total: body.total, items })
    } catch (err: any) {
      throw new AppError(400, err.message)
    }
  }, {
    body: t.Object({
      total: t.Number({ minimum: 0.01 }),
      percentages: t.Array(t.Number({ minimum: 0.01 })),
    }),
    detail: { tags: ['Split'], summary: 'Calcular división de pago' },
  })
