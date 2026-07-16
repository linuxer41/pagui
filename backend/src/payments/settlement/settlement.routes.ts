import { Elysia } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { settlementService } from './settlement.service'

export const settlementRoutes = new Elysia({ prefix: '/settlements' })
  .derive(authMiddleware)
  .get('/', async ({ user }) => {
    const { settlements, totalCount } = await settlementService.listByUser(user.id, {
      page: 1, limit: 50,
    })
    return { success: true, data: { settlements, totalCount } }
  })
  .get('/pending', async ({ user }) => {
    const total = await settlementService.getPendingTotal(user.id)
    const { settlements } = await settlementService.listByUser(user.id, { status: 'pending' })
    return { success: true, data: { pendingTotal: total, settlements } }
  })
