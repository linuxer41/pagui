import { Elysia, t } from 'elysia'
import { qrService } from '../qr/qr.service'
import { eventBus } from '../events/event-bus'

export const hooksRoutes = new Elysia({ prefix: '/hooks' })

  .post('/baneco/notifyPayment', async ({ body }) => {
    await qrService.handleBanecoNotification(body)
    return { responseCode: 0, message: 'Notificación recibida' }
  }, {
    body: t.Object({
      qrId: t.String(),
      transactionId: t.String(),
      amount: t.Number(),
      paymentDate: t.Optional(t.String()),
      paymentHour: t.Optional(t.String()),
      currency: t.Optional(t.String()),
      senderName: t.Optional(t.String()),
      senderDocumentId: t.Optional(t.String()),
      senderAccount: t.Optional(t.String()),
      senderBankCode: t.Optional(t.String()),
    }),
  })
