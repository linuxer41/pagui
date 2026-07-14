import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { getOpenAlerts, resolveAlert } from './fraud.service'
import { AppError } from '../../shared/errors/app-error'

export const fraudRoutes = new Elysia({ prefix: '/fraud' })
  .derive(authMiddleware)
  .get('/alerts', async ({ userId }) => {
    return await getOpenAlerts(userId)
  }, {
    detail: { tags: ['Fraud'], summary: 'Obtener alertas de fraude activas' },
  })
  .post('/alerts/:id/resolve', async ({ params, userId }) => {
    await resolveAlert(params.id, userId)
    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Fraud'], summary: 'Resolver alerta de fraude' },
  })
