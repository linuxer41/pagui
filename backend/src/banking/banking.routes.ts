import { Elysia, t } from 'elysia'
import { Role } from '@pagui/shared'
import { walletService } from './wallet/wallet.service'
import { collectionService } from '../collection/collection.service'
import { tenantRepository } from '../identity/tenants/tenant.repository'

import { ok, list } from '../shared/response'
import { AppError } from '../shared/errors/app-error'

export const bankingRoutes = new Elysia()

  .get('/wallets', async ({ auth }: any) => {
    const isAdmin = auth.user.role === Role.Admin || auth.user.role === Role.Super
    if (isAdmin) {
      const result = await walletService.listAll()
      return list(result.wallets, result.totalCount, 'Billeteras listadas exitosamente')
    }
    const wallets = await walletService.listByUser(auth.user.id)
    return list(wallets, undefined, 'Billeteras listadas exitosamente')
  }, {
    detail: { tags: ['Wallets'], summary: 'Listar billeteras' },
  })

  .get('/wallets/collection', async ({ auth }: any) => {
    const wallet = await walletService.getCollectionAccount(auth.user.id)
    return ok(wallet || null)
  }, {
    detail: { tags: ['Wallets'], summary: 'Obtener billetera de recaudación' },
  })

  .get('/wallets/:id', async ({ params, auth }: any) => {
    const wallet = await walletService.getById(BigInt(params.id))
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    return ok(wallet)
  }, {
    detail: { tags: ['Wallets'], summary: 'Obtener billetera por ID' },
  })

  .get('/wallets/:id/movements', async ({ params, query: q }) => {
    const result = await walletService.getMovements(BigInt(params.id), {
      page: q.page ? parseInt(q.page) : undefined,
      limit: q.limit ? parseInt(q.limit) : undefined,
      from: q.from, to: q.to, type: q.type,
    })
    return list(result.movements, result.totalCount, 'Movimientos listados exitosamente')
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()), limit: t.Optional(t.String()),
      from: t.Optional(t.String()), to: t.Optional(t.String()), type: t.Optional(t.String()),
    })),
    detail: { tags: ['Wallets'], summary: 'Listar movimientos de billetera' },
  })

  .get('/wallets/:id/stats', async ({ params }) => {
    return ok(await walletService.getStats(BigInt(params.id)))
  }, {
    detail: { tags: ['Wallets'], summary: 'Estadísticas de billetera' },
  })

  .post('/wallets/collection', async ({ auth }: any) => {
    const existing = await walletService.getCollectionAccount(auth.user.id)
    if (existing) throw new AppError(400, 'Ya tienes una billetera de recaudación')
    const tenants = await tenantRepository.listByUser(auth.user.id)
    const tenant = tenants[0]
    if (!tenant) throw new AppError(404, 'No tienes un cliente asociado')
    const wallet = await walletService.createCollection(tenant.id)
    await collectionService.upsertConfig(auth.user.id, { walletId: wallet.id, useDefault: true })
    return ok(wallet, 'Billetera de recaudación creada exitosamente')
  }, {
    detail: { tags: ['Wallets'], summary: 'Crear billetera de recaudación' },
  })

  .put('/wallets/:id/set-collection', async ({ params, auth }: any) => {
    const wallet = await walletService.getById(BigInt(params.id))
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    const updated = await walletService.setAsCollection(BigInt(params.id))
    return ok(updated, 'Billetera marcada como recaudación')
  }, {
    detail: { tags: ['Wallets'], summary: 'Marcar billetera como recaudación' },
  })
