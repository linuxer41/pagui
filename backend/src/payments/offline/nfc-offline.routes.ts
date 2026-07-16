import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { createNFCOfflinePayload, processNFCTransaction } from './nfc-offline.service'
import { ok } from '../../shared/response'

export const nfcRoutes = new Elysia({ prefix: '/nfc' })
  .derive(authMiddleware)
  .post('/prepare', async ({ body }) => {
    return ok(await createNFCOfflinePayload(body))
  }, {
    body: t.Object({
      senderWalletId: t.String(),
      receiverWalletId: t.String(),
      amount: t.Number({ minimum: 0.01 }),
    }),
    detail: { tags: ['NFC'], summary: 'Preparar pago NFC offline' },
  })
  .post('/process', async ({ body }) => {
    return ok(await processNFCTransaction({
      nfcId: body.nfcId,
      senderWalletId: BigInt(body.senderWalletId),
      receiverWalletId: BigInt(body.receiverWalletId),
      amount: body.amount,
      timestamp: body.timestamp,
      signature: body.signature,
      nonce: body.nonce,
    }))
  }, {
    body: t.Object({
      nfcId: t.String(),
      senderWalletId: t.String(),
      receiverWalletId: t.String(),
      amount: t.Number(),
      timestamp: t.Number(),
      signature: t.String(),
      nonce: t.String(),
    }),
    detail: { tags: ['NFC'], summary: 'Procesar pago NFC offline' },
  })
