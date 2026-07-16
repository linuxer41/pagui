import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { ok, list, fail } from '@pagui/shared'
import { AppError } from '../../shared/errors/app-error'
import { transactionRepository } from './transaction.repository'

export const transactionsRoutes = new Elysia()
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .get('/transactions', async ({ auth, query: q }) => {
    const userId = auth.user.id
    const page = parseInt(String(q.page || '1'))
    const pageSize = parseInt(String(q.pageSize || '20'))

    const { transactions, totalCount } = await transactionRepository.listByUser(userId, page, pageSize)

    return list(transactions, totalCount, 'Transacciones listadas exitosamente')
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      pageSize: t.Optional(t.String()),
    }),
    detail: { tags: ['Transactions'], summary: 'Listar transacciones del usuario' },
  })

  .get('/transactions/stats/:periodType/:year/:month?/:week?', async ({ auth, params }) => {
    const userId = auth.user.id
    const { periodType, year, month, week } = params as any

    let result
    if (periodType === 'yearly') {
      result = await transactionRepository.getYearlyStats(userId, parseInt(year))
    } else if (periodType === 'monthly') {
      result = await transactionRepository.getMonthlyStats(userId, parseInt(year), parseInt(month))
    } else if (periodType === 'weekly') {
      result = await transactionRepository.getWeeklyStats(userId, parseInt(year), parseInt(week || '1'))
    } else {
      return fail('Tipo de periodo inválido', 'Tipo de periodo inválido')
    }

    return ok({ ...result, responseCode: 0 })
  }, {
    detail: { tags: ['Transactions'], summary: 'Estadísticas de transacciones por periodo' },
  })

  .get('/transactions/:id', async ({ auth, params }) => {
    const userId = auth.user.id
    const { id } = params as any

    const transaction = await transactionRepository.getById(BigInt(id), userId)
    if (!transaction) throw new AppError(404, 'Transacción no encontrada')

    return ok(transaction)
  }, {
    detail: { tags: ['Transactions'], summary: 'Obtener detalle de transacción' },
  })
