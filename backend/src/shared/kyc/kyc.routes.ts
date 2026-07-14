import { Elysia, t } from 'elysia'
import { authMiddleware } from '../middleware/auth.middleware'
import { submitKYC, getKYCStatus, approveKYC, rejectKYC, getPendingKYC } from './kyc.service'

export const kycRoutes = new Elysia({ prefix: '/kyc' })
  .derive(authMiddleware)
  .post('/submit', async ({ userId, body }) => {
    return await submitKYC({ userId, ...body })
  }, {
    body: t.Object({
      fullName: t.String({ minLength: 3 }),
      documentType: t.Enum({ ci: 'ci', passport: 'passport', nit: 'nit' }),
      documentNumber: t.String({ minLength: 5 }),
      birthDate: t.String(),
      nationality: t.String(),
      address: t.String(),
      selfieBase64: t.Optional(t.String()),
      documentFrontBase64: t.Optional(t.String()),
      documentBackBase64: t.Optional(t.String()),
    }),
    detail: { tags: ['KYC'], summary: 'Enviar documentación KYC' },
  })
  .get('/status', async ({ userId }) => {
    return { level: await getKYCStatus(userId) }
  }, {
    detail: { tags: ['KYC'], summary: 'Estado KYC' },
  })
  .post('/:userId/approve', async ({ params, body }) => {
    await approveKYC(params.userId, body.level as any)
    return { success: true }
  }, {
    params: t.Object({ userId: t.String() }),
    body: t.Object({ level: t.Optional(t.String()) }),
    detail: { tags: ['KYC'], summary: 'Aprobar KYC (admin)' },
  })
  .post('/:userId/reject', async ({ params, body }) => {
    await rejectKYC(params.userId, body.reason)
    return { success: true }
  }, {
    params: t.Object({ userId: t.String() }),
    body: t.Object({ reason: t.String() }),
    detail: { tags: ['KYC'], summary: 'Rechazar KYC (admin)' },
  })
  .get('/pending', async () => {
    return await getPendingKYC()
  }, {
    detail: { tags: ['KYC'], summary: 'KYC pendientes (admin)' },
  })
