import { Elysia, t } from 'elysia'
import { Role } from '@pagui/shared'
import { accountService } from './account/account.service'
import { bankCredentialRepository } from './credential/bank-credential.repository'
import { authMiddleware } from '../shared/middleware/auth.middleware'
import { ok, list } from '../shared/response'
import { AppError } from '../shared/errors/app-error'
import { encrypt } from '../shared/crypto'
import { nextSnowflake } from '../shared/snowflake'

export const bankingRoutes = new Elysia()
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .get('/accounts', async ({ auth }: any) => {
    const isAdmin = auth.user.role === Role.Admin || auth.user.role === Role.Super
    if (isAdmin) {
      const result = await accountService.listAll()
      return list(result.accounts, result.totalCount, 'Cuentas listadas exitosamente')
    }
    const accounts = await accountService.listByUser(auth.user.id)
    return list(accounts, undefined, 'Cuentas listadas exitosamente')
  }, {
    detail: { tags: ['Banking'], summary: 'Listar cuentas bancarias' },
  })

  .get('/accounts/:id', async ({ params, auth }: any) => {
    const account = await accountService.getById(BigInt(params.id))
    if (!account) throw new AppError(404, 'Cuenta no encontrada')
    return ok(account)
  }, {
    detail: { tags: ['Banking'], summary: 'Obtener cuenta por ID' },
  })

  .get('/accounts/:id/movements', async ({ params, query: q }) => {
    const result = await accountService.getMovements(BigInt(params.id), {
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
    detail: { tags: ['Banking'], summary: 'Listar movimientos de cuenta' },
  })

  .get('/accounts/:id/stats', async ({ params }) => {
    return ok(await accountService.getStats(BigInt(params.id)))
  }, {
    detail: { tags: ['Banking'], summary: 'Estadísticas de cuenta' },
  })

  .get('/bank-credentials', async ({ auth }: any) => {
    const isAdmin = auth.user.role === Role.Admin || auth.user.role === Role.Super
    const filters: any = {}
    if (!isAdmin) filters.userId = auth.user.id
    const credentials = await bankCredentialRepository.list(filters)
    return list(credentials, undefined, 'Credenciales listadas exitosamente')
  }, {
    detail: { tags: ['Banking'], summary: 'Listar credenciales bancarias' },
  })

  .post('/bank-credentials', async ({ auth, body }: any) => {
    const cred = await bankCredentialRepository.create({
      bankId: 1n,
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      merchantId: body.merchantId || `MERCH-${auth.user.id}`,
      username: body.username,
      password: encrypt(body.password),
      encryptionKey: encrypt(body.encryptionKey),
      environment: body.environment || 'test',
      apiBaseUrl: body.apiBaseUrl || 'https://apimktdesa.baneco.com.bo/ApiGateway',
    })
    return ok(cred, 'Credencial registrada exitosamente')
  }, {
    body: t.Object({
      accountNumber: t.String(), accountName: t.String(),
      username: t.String(), password: t.String(), encryptionKey: t.String(),
      merchantId: t.Optional(t.String()), environment: t.Optional(t.String()),
      apiBaseUrl: t.Optional(t.String()),
    }),
    detail: { tags: ['Banking'], summary: 'Registrar credencial bancaria' },
  })

  .delete('/bank-credentials/:id', async ({ params, auth }: any) => {
    const cred = await bankCredentialRepository.getById(BigInt(params.id))
    if (!cred) throw new AppError(404, 'Credencial no encontrada')
    await bankCredentialRepository.update(BigInt(params.id), { status: 'inactive' })
    return ok(null, 'Credencial eliminada')
  }, {
    detail: { tags: ['Banking'], summary: 'Eliminar credencial bancaria' },
  })

  .post('/bank-credentials/test', async ({ body }: any) => {
    const { BanecoAdapter } = await import('../banking/integration/baneco.adapter')
    const adapter = new BanecoAdapter(
      body.apiBaseUrl || 'https://apimktdesa.baneco.com.bo/ApiGateway',
      body.encryptionKey
    )
    try {
      const token = await adapter.getToken(body.username, body.password)
      return ok({ success: true }, 'Conexión exitosa con Baneco')
    } catch (e: any) {
      throw new AppError(400, 'Error de conexión: ' + e.message)
    }
  }, {
    body: t.Object({
      username: t.String(), password: t.String(),
      encryptionKey: t.String(),
      apiBaseUrl: t.Optional(t.String()),
    }),
    detail: { tags: ['Banking'], summary: 'Probar conexión con Baneco' },
  })
