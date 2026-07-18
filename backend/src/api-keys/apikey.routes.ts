import { Elysia, t } from 'elysia'
import { apiKeyService } from './apikey.service'
import { walletRepository } from '../banking/wallet/wallet.repository'

import { ok, list } from '../shared/response'
import { AppError } from '../shared/errors/app-error'

export const apiKeyRoutes = new Elysia({ prefix: '/api-keys' })

  .get('/', async ({ query, auth }: any) => {
    const walletId = query.walletId ? BigInt(query.walletId) : null
    if (!walletId) throw new AppError(400, 'walletId es requerido')
    const wallet = await walletRepository.getCollectionById(auth.user.id, walletId)
    if (!wallet) throw new AppError(400, 'La billetera no existe o no es de recaudación')
    const keys = await apiKeyService.list(walletId)
    return list(keys, keys.length, 'API keys listadas exitosamente')
  }, {
    query: t.Object({ walletId: t.String() }),
    detail: { tags: ['API Keys'], summary: 'Listar API keys de una billetera de recaudación' },
  })

  .post('/', async ({ body, auth }: any) => {
    const wallet = await walletRepository.getCollectionById(auth.user.id, BigInt(body.walletId))
    if (!wallet) throw new AppError(400, 'La billetera no existe o no es de recaudación')
    const key = await apiKeyService.generate(
      BigInt(body.walletId), body.description, body.permissions, body.expiresAt || null
    )
    return ok(key, 'API key generada exitosamente')
  }, {
    body: t.Object({
      walletId: t.String(),
      description: t.String(),
      permissions: t.Object({
        qr_generate: t.Optional(t.Boolean()),
        qr_status: t.Optional(t.Boolean()),
        qr_cancel: t.Optional(t.Boolean()),
      }),
      expiresAt: t.Optional(t.String()),
    }),
    detail: { tags: ['API Keys'], summary: 'Generar nueva API key para billetera de recaudación' },
  })

  .delete('/:id', async ({ params }: any) => {
    await apiKeyService.revoke(BigInt(params.id))
    return ok(null, 'API key revocada')
  }, {
    detail: { tags: ['API Keys'], summary: 'Revocar API key' },
  })
