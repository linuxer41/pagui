import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { registerAgent, processCashTransaction, getNearbyAgents } from './cash.service'

export const cashRoutes = new Elysia({ prefix: '/cash' })
  .derive(authMiddleware)
  .post('/agents/register', async ({ userId, body }) => {
    return await registerAgent({ userId, ...body })
  }, {
    body: t.Object({
      name: t.String({ minLength: 3 }),
      phone: t.String(),
      address: t.String(),
      lat: t.Number(),
      lng: t.Number(),
      operatingHours: t.Optional(t.String()),
    }),
    detail: { tags: ['Cash'], summary: 'Registrar agente de cash' },
  })
  .post('/transaction', async ({ userId, body }) => {
    return await processCashTransaction({ userId, ...body })
  }, {
    body: t.Object({
      agentId: t.String(),
      userWalletId: t.String(),
      amount: t.Number({ minimum: 0.01 }),
      direction: t.Enum({ cash_in: 'cash_in', cash_out: 'cash_out' }),
      reference: t.String(),
    }),
    detail: { tags: ['Cash'], summary: 'Cash-in o Cash-out' },
  })
  .get('/agents/nearby', async ({ query }) => {
    return await getNearbyAgents({
      lat: parseFloat(query.lat),
      lng: parseFloat(query.lng),
      radiusKm: parseFloat(query.radius || '5'),
    })
  }, {
    query: t.Object({
      lat: t.String(),
      lng: t.String(),
      radius: t.Optional(t.String()),
    }),
    detail: { tags: ['Cash'], summary: 'Agentes cercanos' },
  })
