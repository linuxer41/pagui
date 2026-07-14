import { Elysia, t } from 'elysia'
import { accountService } from './account/account.service'
import { bankCredentialRepository } from './credential/bank-credential.repository'
import { authMiddleware } from '../shared/middleware/auth.middleware'

export const bankingRoutes = new Elysia()
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .get('/accounts', async ({ auth }: any) => {
    const isAdmin = auth.user.role === 'admin'
    if (isAdmin) {
      return accountService.listAll()
    }
    return accountService.listByUser(auth.user.id)
  })

  .get('/accounts/:id', async ({ params, auth }: any) => {
    const account = await accountService.getById(BigInt(params.id))
    if (!account) throw new Error('Cuenta no encontrada')
    return account
  })

  .get('/accounts/:id/movements', async ({ params, query: q }) => {
    return accountService.getMovements(BigInt(params.id), {
      page: q.page ? parseInt(q.page) : undefined,
      limit: q.limit ? parseInt(q.limit) : undefined,
      from: q.from, to: q.to, type: q.type,
    })
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()), limit: t.Optional(t.String()),
      from: t.Optional(t.String()), to: t.Optional(t.String()), type: t.Optional(t.String()),
    })),
  })

  .get('/accounts/:id/stats', async ({ params }) => {
    return accountService.getStats(BigInt(params.id))
  })

  .get('/bank-credentials', async () => {
    return bankCredentialRepository.list()
  })
