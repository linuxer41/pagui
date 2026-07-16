import { logger } from './logger'

const dsn = process.env.SENTRY_DSN
let initialized = false

export const sentry = {
  init() {
    if (!dsn || initialized) return
    initialized = true
    logger.info('Sentry initialized', { dsn: dsn.slice(0, 20) + '...' })
  },

  captureError(error: Error, extra?: Record<string, unknown>) {
    if (!initialized) return
    logger.error('Sentry captured error', { error: error.message, ...extra })
  },

  setUser(userId: string | number) {
    if (!initialized) return
  },

  async flush(timeoutMs = 2000) {
    if (!initialized) return
  },
}

sentry.init()
