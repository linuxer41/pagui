import { Elysia, t } from 'elysia'
import { submitKYC, getKYCStatus, approveKYC, rejectKYC, getPendingKYC } from './kyc.service'
import { ok, list } from '../response'

export const kycRoutes = new Elysia({ prefix: '/kyc' })
  .post('/submit', async ({ auth: { user: { id: userId } }, body }) => {
    return ok(await submitKYC({ userId, ...body }))
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
  .get('/status', async ({ auth: { user: { id: userId } } }) => {
    return ok({ level: await getKYCStatus(userId) })
  }, {
    detail: { tags: ['KYC'], summary: 'Estado KYC' },
  })
  .post('/:userId/approve', async ({ params, body }) => {
    await approveKYC(params.userId, body.level as any)
    return ok(null)
  }, {
    params: t.Object({ userId: t.String() }),
    body: t.Object({ level: t.Optional(t.String()) }),
    detail: { tags: ['KYC'], summary: 'Aprobar KYC (admin)' },
  })
  .post('/:userId/reject', async ({ params, body }) => {
    await rejectKYC(params.userId, body.reason)
    return ok(null)
  }, {
    params: t.Object({ userId: t.String() }),
    body: t.Object({ reason: t.String() }),
    detail: { tags: ['KYC'], summary: 'Rechazar KYC (admin)' },
  })
  .get('/pending', async () => {
    const pending = await getPendingKYC()
    return list(pending, undefined, 'KYC pendientes listados exitosamente')
  }, {
    detail: { tags: ['KYC'], summary: 'KYC pendientes (admin)' },
  })
