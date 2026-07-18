import { Elysia } from 'elysia'
import { empsaatRoutes } from './providers/empsaat/empsaat.controller'
import { transactionRepository } from '../payments/transactions/transaction.repository'
import { walletRepository } from '../banking/wallet/wallet.repository'
import { ok, fail } from '../shared/response'

export const collectionsRoutes = new Elysia()

  .use(empsaatRoutes)

  .get('/collections/stats/:periodType/:year/:month?', async ({ auth, params, query: q }) => {
    const userId = auth.user.id
    const { periodType, year, month } = params as any
    const walletIdStr = (q as any).walletId as string | undefined
    if (!walletIdStr) return fail('walletId es requerido', 'Se requiere el ID de la billetera de recaudación')

    const walletId = BigInt(walletIdStr)
    const wallet = await walletRepository.getCollectionById(userId, walletId)
    if (!wallet) throw new AppError(400, 'La billetera no existe o no es de recaudación')

    let result
    if (periodType === 'yearly') {
      result = await transactionRepository.getYearlyStats(userId, parseInt(year), walletId)
    } else if (periodType === 'monthly') {
      result = await transactionRepository.getMonthlyStats(userId, parseInt(year), parseInt(month), walletId)
    } else if (periodType === 'weekly') {
      const week = parseInt((q as any).week || '1')
      result = await transactionRepository.getWeeklyStats(userId, parseInt(year), week, walletId)
    } else {
      return fail('Tipo de periodo inválido', 'Tipo de periodo inválido')
    }

    return ok({ ...result, responseCode: 0 })
  }, {
    detail: { tags: ['Collections'], summary: 'Estadísticas de recaudación por periodo y billetera' },
  })
