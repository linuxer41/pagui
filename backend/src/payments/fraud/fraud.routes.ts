import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { getOpenAlerts, resolveAlert } from './fraud.service'
import { AppError } from '../../shared/errors/app-error'
import { ok, list } from '../../shared/response'

export const fraudRoutes = new Elysia({ prefix: '/fraud' })
  .derive(authMiddleware)
  .get('/alerts', async ({ userId }) => {
    const alerts = await getOpenAlerts(userId)
    return list(alerts, undefined, 'Alertas listadas exitosamente')
  }, {
    detail: { tags: ['Fraud'], summary: 'Obtener alertas de fraude activas' },
  })
  .post('/alerts/:id/resolve', async ({ params, userId }) => {
    await resolveAlert(params.id, userId)
    return ok(null)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Fraud'], summary: 'Resolver alerta de fraude' },
  })
