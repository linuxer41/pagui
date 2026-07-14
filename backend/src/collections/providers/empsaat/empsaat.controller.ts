import { Elysia, t } from 'elysia'
import { EmpsaatProvider } from './empsaat.service'
import { authMiddleware } from '../../../shared/middleware/auth.middleware'

const empsaat = new EmpsaatProvider()

export const empsaatRoutes = new Elysia({ prefix: '/collections/empsaat' })
  .use(authMiddleware({ type: 'apikey', level: 'user' }))

  .get('/deudas', async ({ query }) => {
    return empsaat.queryDebts({ keyword: query.keyword, type: query.type })
  }, {
    query: t.Object({ keyword: t.String(), type: t.Optional(t.String()) }),
  })

  .post('/deudas/:abonado/transaction', async ({ params, body }) => {
    return empsaat.createTransaction(params.abonado, body.amount, body.description)
  }, {
    body: t.Object({ amount: t.Number(), description: t.Optional(t.String()) }),
  })

  .post('/deudas/transaction/complete', async ({ body }) => {
    return empsaat.completeTransaction(body.transactionId, body.paymentRef)
  }, {
    body: t.Object({ transactionId: t.String(), paymentRef: t.Optional(t.String()) }),
  })

  .get('/deudas/:abonado/transactions', async ({ params }) => {
    return empsaat.getHistory(params.abonado)
  })
