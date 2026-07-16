import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { AppError } from '../shared/errors/app-error'
import { logger, setCorrelationId } from '../shared/logger'
import { sentry } from '../shared/sentry'
import { rateLimit } from '../shared/middleware/rate-limit'
import { complianceHeaders } from '../shared/compliance/pci.service'
import { publicQrRoutes } from './public-qr.routes'

sentry.init()

export async function startPublicApi() {
  const port = parseInt(process.env.PUBLIC_API_PORT || '3001')

  const app = new Elysia()

  app.onRequest(({ request }) => {
    const id = crypto.randomUUID()
    setCorrelationId(id)
  })

  app.onAfterHandle(({ set }) => {
    set.headers = { ...set.headers, ...complianceHeaders() }
  })

  app
    .use(swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'PAGUI Public API',
          version: '1.0.0',
          description: 'API pública con autenticación mediante API Key para operaciones QR.',
        },
        servers: [{ url: `http://localhost:${port}`, description: 'Public API local' }],
        security: [{ ApiKeyAuth: [] }],
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
              description: 'API Key generada desde el panel de usuario',
            },
          },
        },
      },
    }))
    .use(cors({ origin: () => true }))
    .use(rateLimit({ windowMs: 60_000, maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '120') }))
    .use(publicQrRoutes)
    .onError(({ code, error, set, request }) => {
      const err = error as Record<string, unknown>
      const isAppError = err?.statusCode != null && typeof err.statusCode === 'number'
      if (isAppError) {
        set.status = err.statusCode as number
        logger.warn('Public API error', { statusCode: err.statusCode, message: String(err.message || ''), path: new URL(request.url).pathname })
        return { error: err.message as string || 'Error', message: err.message as string || 'Error', details: err.details }
      }
      if (code === 'NOT_FOUND') {
        set.status = 404
        return { error: 'Ruta no encontrada', message: 'Ruta no encontrada' }
      }
      if (code === 'VALIDATION') {
        set.status = 400
        return { error: 'Error de validación', message: 'Error de validación' }
      }
      logger.error('Public API error', { error: String(error), path: new URL(request.url).pathname })
      sentry.captureError(error instanceof Error ? error : new Error(String(error)), { code, path: new URL(request.url).pathname })
      set.status = 500
      return { error: 'Error interno del servidor', message: 'Error interno del servidor' }
    })

  app.listen(port, () => logger.info(`Public API on :${port}`))
  return app
}
