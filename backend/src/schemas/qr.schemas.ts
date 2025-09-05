import { Static, t } from "elysia";

export const QRRequestSchema = t.Object({
    transactionId: t.String(),
    amount: t.Number(),
    description: t.Optional(t.String()),
    bankId: t.Optional(t.Number({default: 1})),
    dueDate: t.String(), // Campo obligatorio para la base de datos
    singleUse: t.Optional(t.Boolean({default: false})),
    modifyAmount: t.Optional(t.Boolean({default: false})),
  })

export type QRRequest = Static<typeof QRRequestSchema>;

