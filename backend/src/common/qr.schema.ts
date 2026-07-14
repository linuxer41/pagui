import { t } from 'elysia'

export const QRRequestSchema = t.Object({
  amount: t.Number({ minimum: 0.01 }),
  currency: t.Optional(t.String({ default: 'BOB' })),
  description: t.Optional(t.String()),
  dueDate: t.Optional(t.String()),
  singleUse: t.Optional(t.Boolean({ default: true })),
  modifyAmount: t.Optional(t.Boolean({ default: false })),
  accountId: t.Optional(t.Number()),
})
