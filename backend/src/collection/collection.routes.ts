import { Elysia, t } from 'elysia'
import crypto from 'node:crypto'
import { walletService } from '../banking/wallet/wallet.service'
import { bankCredentialRepository } from '../banking/credential/bank-credential.repository'
import { collectionService } from './collection.service'
import { bankAccountRepository } from './bank-account.repository'

import { ok, list } from '../shared/response'
import { AppError } from '../shared/errors/app-error'
import { nextSnowflake } from '../shared/snowflake'

export const collectionRoutes = new Elysia()

  // ── Baneco Credentials ──
  .get('/baneco-credentials', async ({ auth }: any) => {
    const creds = await bankCredentialRepository.list({ userId: auth.user.id, isActive: true })
    return list(creds, creds.length, 'Credenciales listadas')
  }, {
    detail: { tags: ['Collection'], summary: 'Listar credenciales Baneco' },
  })

  .post('/baneco-credentials', async ({ auth, body }: any) => {
    // Get tenant environment to use appropriate defaults
    const { query } = await import('../shared/database/pool')
    const tenant = await query(`
      SELECT t.environment FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE tu.user_id = $1 AND t.deleted_at IS NULL AND tu.deleted_at IS NULL
      LIMIT 1
    `, [auth.user.id])
    const isProd = tenant.rowCount && tenant.rows[0].environment === 'production'
    const apiBaseUrl = isProd
      ? (process.env.BANECO_PROD_API_URL || 'https://apimkt.baneco.com.bo/ApiGateway')
      : (process.env.BANECO_SANDBOX_API_URL || 'https://apimktdesa.baneco.com.bo/ApiGateway')

    const cred = await bankCredentialRepository.create({
      bankId: 1n,
      accountHolder: body.accountHolder,
      accountNumber: body.accountNumber,
      username: body.username,
      password: body.password,
      encryptionKey: crypto.randomBytes(16).toString('hex').toUpperCase(),
      environment: isProd ? 'prod' : 'test',
      apiBaseUrl,
      userId: auth.user.id,
    })
    return ok(cred, 'Credencial creada')
  }, {
    body: t.Object({
      accountHolder: t.String(),
      accountNumber: t.String(),
      username: t.String(),
      password: t.String(),
    }),
    detail: { tags: ['Collection'], summary: 'Crear credencial Baneco' },
  })

  .delete('/baneco-credentials/:id', async ({ params }: any) => {
    await bankCredentialRepository.delete(BigInt(params.id))
    return ok(null, 'Credencial eliminada')
  }, {
    detail: { tags: ['Collection'], summary: 'Eliminar credencial Baneco' },
  })

  .post('/baneco-credentials/test', async ({ body }: any) => {
    if (!body.username || !body.password || !body.encryptionKey) {
      throw new AppError(400, 'Faltan campos requeridos')
    }
    return ok({ success: true }, 'Conexión exitosa')
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      encryptionKey: t.String(),
    }),
    detail: { tags: ['Collection'], summary: 'Probar conexión Baneco' },
  })

  // ── Banks ──
  .get('/banks', async () => {
    const { query } = await import('../shared/database/pool')
    const r = await query('SELECT code, name FROM banks WHERE is_active = true ORDER BY name')
    return list(r.rows, r.rows.length)
  }, {
    detail: { tags: ['Collection'], summary: 'Listar bancos disponibles' },
  })

  // ── Bank Accounts ──
  .get('/bank-accounts', async ({ auth }: any) => {
    const accounts = await bankAccountRepository.listByUser(auth.user.id)
    return list(accounts, accounts.length, 'Cuentas listadas')
  }, {
    detail: { tags: ['Collection'], summary: 'Listar cuentas bancarias' },
  })

  .post('/bank-accounts', async ({ auth, body }: any) => {
    const account = await bankAccountRepository.create({
      userId: auth.user.id,
      bankCode: body.bankCode,
      accountHolder: body.accountHolder,
      accountNumber: body.accountNumber,
      holderDocument: body.holderDocument || '',
    })
    return ok(account, 'Cuenta guardada')
  }, {
    body: t.Object({
      bankCode: t.String(),
      accountHolder: t.String(),
      accountNumber: t.String(),
      holderDocument: t.Optional(t.String()),
    }),
    detail: { tags: ['Collection'], summary: 'Crear cuenta bancaria' },
  })

  .delete('/bank-accounts/:id', async ({ params }: any) => {
    await bankAccountRepository.delete(BigInt(params.id))
    return ok(null, 'Cuenta eliminada')
  }, {
    detail: { tags: ['Collection'], summary: 'Eliminar cuenta bancaria' },
  })

  // ── Collection Config ──
  .get('/collection/config', async ({ auth }: any) => {
    const config = await collectionService.getConfig(auth.user.id)
    return ok(config || null)
  }, {
    detail: { tags: ['Collection'], summary: 'Obtener configuración de recaudación' },
  })

  .post('/collection/config', async ({ auth, body }: any) => {
    let wallet = await walletService.getCollectionAccount(auth.user.id)
    if (!wallet) throw new AppError(404, 'Primero crea una billetera de recaudación')
    const config = await collectionService.upsertConfig(auth.user.id, {
      walletId: wallet.id,
      useDefault: body.useDefault,
      banecoCredentialId: body.banecoCredentialId ? BigInt(body.banecoCredentialId) : null,
      bankAccountId: body.bankAccountId ? BigInt(body.bankAccountId) : null,
      collectionType: body.collectionType ?? 'gateway',
      commissionRate: body.commissionRate ?? 0,
    })
    return ok(config, 'Configuración guardada')
  }, {
    body: t.Object({
      useDefault: t.Optional(t.Boolean()),
      banecoCredentialId: t.Optional(t.String()),
      bankAccountId: t.Optional(t.String()),
      autoTransferFreq: t.Optional(t.String()),
      collectionType: t.Optional(t.String()),
      commissionRate: t.Optional(t.Number()),
    }),
    detail: { tags: ['Collection'], summary: 'Guardar configuración de recaudación' },
  })
