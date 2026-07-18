import { Elysia, t } from 'elysia'
import { liquidationService } from './liquidation.service'
import { bankAccountRepository } from './bank-account.repository'
import { ok } from '../shared/response'
import { AppError } from '../shared/errors/app-error'

export const liquidationRoutes = new Elysia()

  .post('/liquidations/manual', async ({ auth, body }: any) => {
    const bankAccount = await bankAccountRepository.getById(BigInt(body.bankAccountId))
    if (!bankAccount) throw new AppError(404, 'Cuenta bancaria no encontrada')
    const result = await liquidationService.createManual(auth.user.id, BigInt(body.bankAccountId), body.amount)
    return ok(result, 'Retiro procesado exitosamente')
  }, {
    body: t.Object({
      bankAccountId: t.String(),
      amount: t.Number(),
    }),
    detail: { tags: ['Liquidations'], summary: 'Retiro manual a cuenta bancaria' },
  })

  .get('/liquidations', async ({ auth, query: { page, limit } }: any) => {
    const result = await liquidationService.listByUser(auth.user.id, Number(page) || 1, Number(limit) || 50)
    return ok(result, 'Historial de retiros')
  }, {
    detail: { tags: ['Liquidations'], summary: 'Listar retiros' },
  })
