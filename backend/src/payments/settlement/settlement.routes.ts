import { Elysia } from 'elysia'
import { settlementService } from './settlement.service'

export const settlementRoutes = new Elysia({ prefix: '/settlements' })
  .get('/', async ({ auth: { user } }) => {
    const { settlements, totalCount } = await settlementService.listByUser(user.id, {
      page: 1, limit: 50,
    })
    return { success: true, data: { settlements, totalCount } }
  })
  .get('/pending', async ({ auth: { user } }) => {
    const total = await settlementService.getPendingTotal(user.id)
    const { settlements } = await settlementService.listByUser(user.id, { status: 'pending' })
    return { success: true, data: { pendingTotal: total, settlements } }
  })
