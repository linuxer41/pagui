import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { waitForConnection } from './shared/database/pool'
import { migrateDB } from './shared/database/migrate'

;(BigInt.prototype as any).toJSON = function () { return String(this) }
import { AppError } from './shared/errors/app-error'
import { logger, setCorrelationId } from './shared/logger'
import { rateLimit } from './shared/middleware/rate-limit'
import { authMiddleware } from './shared/middleware/auth.middleware'
import { sentry } from './shared/sentry'
import { complianceHeaders } from './shared/compliance/pci.service'
import { fail } from '@pagui/shared'

import { authRoutes } from './identity/auth.routes'
import { userRoutes } from './identity/user.routes'
import { tenantRoutes } from './identity/tenants/tenant.routes'
import { bankingRoutes } from './banking/banking.routes'
import { qrRoutes } from './payments/qr/qr.routes'
import { hooksRoutes } from './payments/payment/hooks.routes'
import { paymentRoutes } from './payments/payment/payment.routes'
import { sseRoutes } from './payments/events/sse.controller'
import { transactionsRoutes } from './payments/transactions/transactions.routes'
import { collectionsRoutes } from './collections/collections.routes'
import { apiKeyRoutes } from './api-keys/apikey.routes'
import { healthRoutes } from './monitoring/health.controller'
import { startPublicApi } from './public-api/public-api'
import { paymentQueueService } from './payments/sync/payment-queue.service'
import { sseService } from './payments/events/sse.service'
import { webhookRoutes } from './payments/webhooks/webhook.routes'
import { startWebhookProcessor } from './payments/webhooks/webhook.service'
import { wsRoutes } from './shared/ws'
import { nfcRoutes } from './payments/offline/nfc-offline.routes'
import { kycRoutes } from './shared/kyc/kyc.routes'
import { settlementRoutes } from './payments/settlement/settlement.routes'
import { settlementService } from './payments/settlement/settlement.service'
import { collectionRoutes } from './collection/collection.routes'
import { liquidationRoutes } from './collection/liquidation.routes'
import { directTransactionRoutes } from './collection/direct-transaction.routes'

let qrSweeper: ReturnType<typeof setInterval> | undefined
import { adminRoutes } from './admin/admin.routes'
import { requireRole } from './shared/middleware/auth.middleware'

sentry.init()

const app = new Elysia()

app.onRequest(({ request }) => {
  const id = crypto.randomUUID()
  setCorrelationId(id)
})

app.onAfterHandle(({ request, set }) => {
  set.headers = { ...set.headers, ...complianceHeaders() }
  const url = new URL(request.url)
  logger.info(`${request.method} ${url.pathname} → ${set.status}`, {
    method: request.method, path: url.pathname, status: set.status,
  })
})

app.use(swagger({ path: '/swagger' }))
  .use(cors({ origin: () => true }))
  .use(rateLimit({ windowMs: 60_000, maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '120') }))
  .use(healthRoutes)
  .use(authRoutes)
  .use(sseRoutes)
  .derive(authMiddleware())
  .use(userRoutes)
  .use(tenantRoutes)
  .use(bankingRoutes)
  .use(qrRoutes)
  .use(hooksRoutes)
  .use(paymentRoutes)
  .use(transactionsRoutes)
  .use(collectionsRoutes)
  .use(apiKeyRoutes)
  .use(webhookRoutes)
  .use(wsRoutes)
  .use(nfcRoutes)
  .use(kycRoutes)
  .use(settlementRoutes)
  .use(liquidationRoutes)
  .use(directTransactionRoutes)
  .use(collectionRoutes)
  .guard({ beforeHandle: [({ auth }: any) => requireRole(1)(auth)] })
  .use(adminRoutes)
  .onError(({ code, error, set, request }) => {
    const path = new URL(request.url).pathname
    const err = error as Record<string, unknown>
    const isAppError = err?.statusCode != null && typeof err.statusCode === 'number'
    if (isAppError) {
      set.status = err.statusCode as number
      logger.warn('App error', { statusCode: err.statusCode, message: String(err.message || ''), path, error })
      return fail(String(err.message || 'Error'), String(err.message || 'Error'), err.details)
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      logger.warn('Not found', { path })
      return fail('Ruta no encontrada', 'Ruta no encontrada')
    }
    if (code === 'VALIDATION') {
      set.status = 400
      logger.warn('Validation error', { path, error: String(error) })
      return fail('Error de validación', 'Error de validación')
    }
    const errObj = error instanceof Error ? error : new Error(String(error))
    logger.error('Unhandled error', { error: errObj, code, path })
    set.status = 500
    return fail('Error interno del servidor', 'Error interno del servidor')
  })

const mode = process.argv[2]

if (mode === 'init-db') {
  migrateDB(true).then(() => process.exit(0))
} else if (mode === 'seed') {
  migrateDB(true).then(async () => {
    const { seedMinimal } = await import('./scripts/seed-minimal')
    await seedMinimal()
    process.exit(0)
  })
} else if (mode === 'seed:test') {
  migrateDB(true).then(async () => {
    const { seedMinimal } = await import('./scripts/seed-minimal')
    await seedMinimal()
    const { seedTest } = await import('./scripts/seed-test')
    await seedTest()
    process.exit(0)
  })
} else if (mode === 'migrate') {
  migrateDB(false).then(async () => {
    const { runMigrations } = await import('./shared/database/migrate')
    await runMigrations()
    process.exit(0)
  })
} else {
  migrateDB(false).then(async () => {
    await waitForConnection()
    startWebhookProcessor()
    const settlementInterval = setInterval(() => settlementService.processPending(), 60_000)
    // Re-encola QRs activos y vigila pérdidas (cubre reinicios del proceso).
    await paymentQueueService.startAll()
    qrSweeper = paymentQueueService.startSweeper()
    logger.info('All services initialized')
    const port = parseInt(process.env.PORT || '3000')
    app.listen(port, () => {
      logger.info(`Server on :${port}`)
      startPublicApi()
    })
  }).catch((err) => {
    logger.error('Startup failed', { error: String(err) })
    process.exit(1)
  })
}

process.on('SIGINT', () => {
  logger.info('Shutting down...')
  sseService.closeAll()
  clearInterval(qrSweeper)
  paymentQueueService.stopAll()
  logger.flush?.()
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('Shutting down...')
  sseService.closeAll()
  clearInterval(qrSweeper)
  paymentQueueService.stopAll()
  logger.flush?.()
  process.exit(0)
})
