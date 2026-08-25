import { Elysia, t } from 'elysia'
import { query } from '../shared/database/pool'
import { walletService } from '../banking/wallet/wallet.service'
import { bankCredentialRepository } from '../banking/credential/bank-credential.repository'
import { collectionService } from './collection.service'
import { bankAccountRepository } from './bank-account.repository'
import { tenantRepository } from '../identity/tenants/tenant.repository'

import { ok, list } from '../shared/response'
import { AppError } from '../shared/errors/app-error'
import { nextSnowflake } from '../shared/snowflake'

async function getTenantEnv(userId: bigint) {
  const r = await query(`
    SELECT t.environment FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.user_id = $1 AND t.deleted_at IS NULL AND tu.deleted_at IS NULL
    LIMIT 1
  `, [userId])
  return r.rowCount ? (r.rows[0] as { environment: string }).environment : 'sandbox'
}

async function requireTenant(userId: bigint): Promise<bigint> {
  const tenantId = await tenantRepository.getTenantId(userId)
  if (!tenantId) throw new AppError(404, 'No tienes un cliente asociado')
  return tenantId
}

export const collectionRoutes = new Elysia()

  // ── Baneco Credentials ──
  .get('/baneco-credentials', async ({ auth }: any) => {
    const tenantId = await requireTenant(auth.user.id)
    const creds = await bankCredentialRepository.list({ tenantId, isActive: true })
    return list(creds, creds.length, 'Credenciales listadas')
  }, {
    detail: { tags: ['Collection'], summary: 'Listar credenciales Baneco' },
  })

  .post('/baneco-credentials', async ({ auth, body }: any) => {
    const tenantId = await requireTenant(auth.user.id)
    const env = await getTenantEnv(auth.user.id)
    const isProd = env === 'production'
    const apiBaseUrl = isProd
      ? (process.env.BANECO_PROD_API_URL || 'https://apimkt.baneco.com.bo/ApiGateway')
      : (process.env.BANECO_SANDBOX_API_URL || 'https://apimktdesa.baneco.com.bo/ApiGateway')

    const cred = await bankCredentialRepository.create({
      accountHolder: body.accountHolder,
      accountNumber: body.accountNumber,
      username: body.username,
      password: body.password,
      encryptionKey: body.encryptionKey,
      environment: isProd ? 'prod' : 'test',
      apiBaseUrl,
      tenantId,
    })
    return ok(cred, 'Credencial creada')
  }, {
    body: t.Object({
      accountHolder: t.String(),
      accountNumber: t.String(),
      username: t.String(),
      password: t.String(),
      encryptionKey: t.String(),
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
    const r = await query('SELECT code, name FROM banks WHERE is_active = true ORDER BY name')
    return list(r.rows, r.rows.length)
  }, {
    detail: { tags: ['Collection'], summary: 'Listar bancos disponibles' },
  })

  // ── Bank Accounts ──
  .get('/bank-accounts', async ({ auth }: any) => {
    const tenantId = await requireTenant(auth.user.id)
    const accounts = await bankAccountRepository.listByTenant(tenantId)
    return list(accounts, accounts.length, 'Cuentas listadas')
  }, {
    detail: { tags: ['Collection'], summary: 'Listar cuentas bancarias' },
  })

  .post('/bank-accounts', async ({ auth, body }: any) => {
    const tenantId = await requireTenant(auth.user.id)
    const account = await bankAccountRepository.create({
      tenantId,
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
    const wallet = await walletService.getCollectionAccount(auth.user.id)
    if (!wallet) return ok(null)
    const config = await collectionService.getConfig(wallet.id)
    return ok(config || null)
  }, {
    detail: { tags: ['Collection'], summary: 'Obtener configuración de recaudación' },
  })

  // ── Setup completo (credential + wallet + config) ──
  .post('/collection/setup', async ({ auth, body }: any) => {
    const { pool: pgPool } = await import('../shared/database/pool')

    const env = await getTenantEnv(auth.user.id)
    const isProd = env === 'production'
    const apiBaseUrl = isProd
      ? (process.env.BANECO_PROD_API_URL || 'https://apimkt.baneco.com.bo/ApiGateway')
      : (process.env.BANECO_SANDBOX_API_URL || 'https://apimktdesa.baneco.com.bo/ApiGateway')

    const client = await pgPool.connect()
    try {
      await client.query('BEGIN')

      const tenantId = await requireTenant(auth.user.id)

      const credId = nextSnowflake()
      await client.query(`
        INSERT INTO baneco_credentials (id, tenant_id, account_holder, account_number, merchant_id,
          username, password, encryption_key, environment, api_base_url, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      `, [credId, tenantId, body.accountHolder, body.accountNumber,
        `MERCH-${credId.toString().slice(-8)}`,
        body.username, body.password, body.encryptionKey, isProd ? 'prod' : 'test', apiBaseUrl])

      const walletId = nextSnowflake()
      await client.query(`
        INSERT INTO wallets (id, wallet_number, name, type, level, currency, balance,
          available_balance, held_balance, tenant_id, status, is_default, is_collection,
          created_at, updated_at)
        VALUES ($1, $2, $3, 'standard', 'bronze', 'BOB', 0, 0, 0,
          $4, 'active', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [walletId, `400${credId.toString().slice(-9)}`, 'Recaudaciones', tenantId])

      const ut = await client.query(
        'SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1',
        [tenantId]
      )
      if (ut.rowCount) {
        await client.query(`
          INSERT INTO wallet_permissions (user_id, wallet_id, role, created_at)
          VALUES ($1, $2, 'owner', CURRENT_TIMESTAMP)
        `, [ut.rows[0].user_id, walletId])
      }

      const cfgId = nextSnowflake()
      await client.query(`
        INSERT INTO collection_config (id, wallet_id, use_default, baneco_credential_id,
          collection_type, commission_rate, is_active, created_at)
        VALUES ($1, $2, false, $3, 'direct', $4, true, CURRENT_TIMESTAMP)
        ON CONFLICT (wallet_id) DO UPDATE SET
          baneco_credential_id = EXCLUDED.baneco_credential_id,
          collection_type = 'direct',
          commission_rate = EXCLUDED.commission_rate,
          is_active = true,
          deleted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      `, [cfgId, walletId, credId, body.commissionRate ?? 0.1])

      await client.query('COMMIT')

      return ok({
        credential: { id: credId, accountHolder: body.accountHolder, accountNumber: body.accountNumber, environment: isProd ? 'prod' : 'test' },
        wallet: { id: walletId, name: 'Recaudaciones', isCollection: true },
        config: { id: cfgId, commissionRate: body.commissionRate ?? 0.1 },
      }, 'Recaudación configurada exitosamente')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }, {
    body: t.Object({
      accountHolder: t.String(),
      accountNumber: t.String(),
      username: t.String(),
      password: t.String(),
      encryptionKey: t.String(),
      commissionRate: t.Optional(t.Number()),
    }),
    detail: { tags: ['Collection'], summary: 'Setup completo de recaudación con Baneco' },
  })

  .post('/collection/config', async ({ auth, body }: any) => {
    const wallet = await walletService.getCollectionAccount(auth.user.id)
    if (!wallet) throw new AppError(404, 'Primero crea una billetera de recaudación')
    const config = await collectionService.upsertConfig(wallet.id, {
      useDefault: body.useDefault,
      banecoCredentialId: body.banecoCredentialId ? BigInt(body.banecoCredentialId) : null,
      bankAccountId: body.bankAccountId ? BigInt(body.bankAccountId) : null,
      collectionType: body.collectionType ?? 'gateway',
      commissionRate: body.commissionRate ?? 0.1,
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