import { Elysia, t } from 'elysia'
import { EmpsaatProvider } from './empsaat.service'
import { authMiddleware } from '../../../shared/middleware/auth.middleware'
import { ok } from '../../../shared/response'

const empsaat = new EmpsaatProvider()

export const empsaatRoutes = new Elysia({ prefix: '/collections/empsaat' })
  .use(authMiddleware({ type: 'apikey', level: 'user' }))

  .get('/deudas', async ({ query }) => {
    return ok(await empsaat.queryDebts({ keyword: query.keyword, type: query.type }))
  }, {
    query: t.Object({ keyword: t.String(), type: t.Optional(t.String()) }),
    detail: { tags: ['EMPSAAT'], summary: 'Consultar deudas por keyword' },
  })

  .post('/deudas/:abonado/transaction', async ({ params, body }) => {
    return ok(await empsaat.createTransaction(params.abonado, body.amount, body.description))
  }, {
    body: t.Object({ amount: t.Number(), description: t.Optional(t.String()) }),
    detail: { tags: ['EMPSAAT'], summary: 'Crear transacción de pago' },
  })

  .post('/deudas/transaction/complete', async ({ body }) => {
    return ok(await empsaat.completeTransaction(body.transactionId, body.paymentRef))
  }, {
    body: t.Object({ transactionId: t.String(), paymentRef: t.Optional(t.String()) }),
    detail: { tags: ['EMPSAAT'], summary: 'Completar transacción' },
  })

  .get('/deudas/:abonado/transactions', async ({ params }) => {
    return ok(await empsaat.getHistory(params.abonado))
  }, {
    detail: { tags: ['EMPSAAT'], summary: 'Historial de transacciones' },
  })
