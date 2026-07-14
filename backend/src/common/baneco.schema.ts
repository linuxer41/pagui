import { t } from '@sinclair/typebox'

export const BANECO_AuthResponseSchema = t.Object({
  responseCode: t.Number(),
  message: t.String(),
  token: t.String(),
})

export const BANECO_QRGenerateRequestSchema = t.Object({
  transactionId: t.String(),
  accountCredit: t.String(),
  currency: t.Union([t.Literal('BOB'), t.Literal('USD')]),
  amount: t.Number(),
  description: t.String(),
  dueDate: t.String(),
  singleUse: t.Boolean(),
  modifyAmount: t.Boolean(),
  branchCode: t.String(),
})

export const BANECO_QRGenerateResponseSchema = t.Object({
  responseCode: t.Number(),
  message: t.String(),
  qrId: t.String(),
  qrImage: t.String(),
  reference: t.String(),
})

export const BANECO_QRCancelRequestSchema = t.Object({
  qrId: t.String(),
})

export const BANECO_QRCancelResponseSchema = t.Object({
  responseCode: t.Number(),
  message: t.String(),
})

export const BANECO_QRStatusResponseSchema = t.Object({
  responseCode: t.Number(),
  message: t.String(),
  qrId: t.String(),
  transactionId: t.String(),
  amount: t.Number(),
  currency: t.String(),
  description: t.String(),
  dueDate: t.String(),
  status: t.String(),
  qrImage: t.String(),
  singleUse: t.Boolean(),
  modifyAmount: t.Boolean(),
  createdDate: t.String(),
  expirationDate: t.String(),
  accountCredit: t.String(),
  branchCode: t.String(),
})

export const BANECO_PaidQRResponseSchema = t.Object({
  responseCode: t.Number(),
  message: t.String(),
  paymentList: t.Array(t.Object({
    qrId: t.String(),
    transactionId: t.String(),
    amount: t.Number(),
    currency: t.String(),
    paymentDate: t.String(),
    paymentHour: t.String(),
  })),
})
