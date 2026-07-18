import { Elysia, t } from 'elysia'
import { directTransactionService } from './direct-transaction.service'
import { ok } from '../shared/response'

export const directTransactionRoutes = new Elysia()

  .get('/direct-transactions', async ({ auth, query: { page, limit } }: any) => {
    const result = await directTransactionService.listByUser(auth.user.id, Number(page) || 1, Number(limit) || 50)
    return ok(result, 'Transacciones directas')
  }, {
    detail: { tags: ['Collection'], summary: 'Listar transacciones Baneco Direct' },
  })

  .get('/direct-transactions/pending', async ({ auth }: any) => {
    const total = await directTransactionService.getPendingTotal(auth.user.id)
    const { items } = await directTransactionService.listByUser(auth.user.id, 1, 50)
    return ok({ pendingTotal: total, items: items.filter(i => !i.commissionPaid) }, 'Comisiones pendientes')
  }, {
    detail: { tags: ['Collection'], summary: 'Comisiones pendientes por cobrar' },
  })

  .put('/direct-transactions/:id/pay', async ({ params }: any) => {
    await directTransactionService.markAsPaid(BigInt(params.id))
    return ok(null, 'Comisión marcada como cobrada')
  }, {
    detail: { tags: ['Collection'], summary: 'Marcar comisión como cobrada' },
  })
