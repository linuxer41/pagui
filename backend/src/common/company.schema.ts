import { t } from 'elysia'

export const CompanyBankSchema = t.Object({
  bankId: t.Number(),
  accountNumber: t.String(),
  accountName: t.String(),
  merchantId: t.String(),
  username: t.String(),
  password: t.String(),
  environment: t.String(),
  apiBaseUrl: t.String(),
})

export const CompanyBankResponseSchema = t.Object({
  id: t.Number(),
  bankId: t.Number(),
  accountNumber: t.String(),
  accountName: t.String(),
  environment: t.String(),
  status: t.String(),
})
