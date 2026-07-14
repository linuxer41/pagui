import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { reconcileAccount, getReconciliationLogs, getPendingReconciliations, reconcile } from './reconciliation.service'

export const reconciliationRoutes = new Elysia({ prefix: '/reconciliation' })
  .derive(authMiddleware)
  .post('/account/:accountId', async ({ params }) => {
    return { results: await reconcileAccount(params.accountId) }
  }, {
    params: t.Object({ accountId: t.String() }),
    detail: { tags: ['Reconciliation'], summary: 'Reconciliar cuenta bancaria' },
  })
  .get('/pending', async ({ userId }) => {
    return await getPendingReconciliations(userId)
  }, {
    detail: { tags: ['Reconciliation'], summary: 'Reconciliaciones pendientes' },
  })
  .get('/logs/:accountId', async ({ params }) => {
    return await getReconciliationLogs(params.accountId)
  }, {
    params: t.Object({ accountId: t.String() }),
    detail: { tags: ['Reconciliation'], summary: 'Logs de reconciliación' },
  })
  .post('/manual', async ({ userId, body }) => {
    return await reconcile({
      bankAccountId: body.accountId,
      externalReference: body.externalReference,
      localAmount: body.localAmount,
      bankAmount: body.bankAmount,
      source: 'manual',
      notes: body.notes,
    })
  }, {
    body: t.Object({
      accountId: t.String(),
      externalReference: t.String(),
      localAmount: t.Number(),
      bankAmount: t.Number(),
      notes: t.Optional(t.String()),
    }),
    detail: { tags: ['Reconciliation'], summary: 'Reconciliación manual' },
  })
