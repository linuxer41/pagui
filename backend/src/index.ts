import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { testConnection } from './shared/database/pool'
import { migrateDB } from './shared/database/migrate'
import { AppError } from './shared/errors/app-error'
import { logger, setCorrelationId } from './shared/logger'
import { rateLimit } from './shared/middleware/rate-limit'
import { sentry } from './shared/sentry'
import { complianceHeaders } from './shared/compliance/pci.service'

import { authRoutes } from './identity/auth.routes'
import { userRoutes } from './identity/user.routes'
import { bankingRoutes } from './banking/banking.routes'
import { qrRoutes } from './payments/qr/qr.routes'
import { hooksRoutes } from './payments/payment/hooks.routes'
import { paymentRoutes } from './payments/payment/payment.routes'
import { sseRoutes } from './payments/events/sse.controller'
import { collectionsRoutes } from './collections/collections.routes'
import { apiKeyRoutes } from './api-keys/apikey.routes'
import { healthRoutes } from './monitoring/health.controller'
import { paymentQueueService } from './payments/sync/payment-queue.service'
import { sseService } from './payments/events/sse.service'
import { fraudRoutes } from './payments/fraud/fraud.routes'
import { fxRoutes } from './payments/fx/fx.routes'
import { webhookRoutes } from './payments/webhooks/webhook.routes'
import { startWebhookProcessor } from './payments/webhooks/webhook.service'
import { reconciliationRoutes } from './payments/reconciliation/reconciliation.routes'
import { walletBackupRoutes } from './payments/wallet/wallet-backup.routes'
import { wsRoutes } from './shared/ws'
import { subscriptionRoutes } from './payments/subscription/subscription.routes'
import { splitRoutes } from './payments/split/split.routes'
import { merchantRoutes } from './payments/merchant/merchant.routes'
import { pushRoutes } from './payments/push/push.routes'
import { cashRoutes } from './payments/cash/cash.routes'
import { nfcRoutes } from './payments/offline/nfc-offline.routes'
import { kycRoutes } from './shared/kyc/kyc.routes'
import { complianceRoutes } from './shared/compliance/compliance.routes'

sentry.init()

const app = new Elysia()

app.onRequest(({ request }) => {
  const id = crypto.randomUUID()
  setCorrelationId(id)
})

app.onAfterHandle(({ set }) => {
  set.headers = { ...set.headers, ...complianceHeaders() }
})

app.use(swagger({ path: '/swagger' }))
  .use(cors({ origin: () => true }))
  .use(rateLimit({ windowMs: 60_000, maxRequests: 120 }))
  .use(healthRoutes)
  .use(authRoutes)
  .use(userRoutes)
  .use(bankingRoutes)
  .use(qrRoutes)
  .use(hooksRoutes)
  .use(paymentRoutes)
  .use(sseRoutes)
  .use(collectionsRoutes)
  .use(apiKeyRoutes)
  .use(fraudRoutes)
  .use(fxRoutes)
  .use(webhookRoutes)
  .use(reconciliationRoutes)
  .use(walletBackupRoutes)
  .use(wsRoutes)
  .use(subscriptionRoutes)
  .use(splitRoutes)
  .use(merchantRoutes)
  .use(pushRoutes)
  .use(cashRoutes)
  .use(nfcRoutes)
  .use(kycRoutes)
  .use(complianceRoutes)
  .onError(({ code, error, set, request }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode
      logger.warn('App error', { statusCode: error.statusCode, message: error.message, path: new URL(request.url).pathname })
      return { error: error.message, details: error.details }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Ruta no encontrada' }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Error de validación' }
    }
    logger.error('Unhandled error', { error: String(error), path: new URL(request.url).pathname })
    sentry.captureError(error instanceof Error ? error : new Error(String(error)), {
      code,
      path: new URL(request.url).pathname,
    })
    set.status = 500
    return { error: 'Error interno del servidor' }
  })

const mode = process.argv[2]

if (mode === 'init-db') {
  migrateDB(true).then(() => process.exit(0))
} else if (mode === 'seed') {
  migrateDB(true).then(async () => {
    const { seedDatabase } = await import('./scripts/seed-db')
    await seedDatabase()
    process.exit(0)
  })
} else {
  migrateDB(false).then(async () => {
    testConnection()
    startWebhookProcessor()
    logger.info('All services initialized', {
      redis: !!process.env.REDIS_URL,
      sentry: !!process.env.SENTRY_DSN,
      otel: !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    })
    const port = parseInt(process.env.PORT || '3000')
    app.listen(port, () => logger.info(`Server on :${port}`))
  })
}

process.on('SIGINT', () => {
  logger.info('Shutting down...')
  sseService.closeAll()
  paymentQueueService.stopAll()
  logger.flush?.()
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('Shutting down...')
  sseService.closeAll()
  paymentQueueService.stopAll()
  logger.flush?.()
  process.exit(0)
})
