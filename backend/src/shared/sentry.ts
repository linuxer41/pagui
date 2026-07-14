const dsn = process.env.SENTRY_DSN
let initialized = false

interface SentryEvent {
  message?: string
  level?: 'error' | 'warning' | 'info'
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  error?: Error
}

export const sentry = {
  init() {
    if (!dsn || initialized) return
    initialized = true
    console.log('[sentry] initialized, DSN:', dsn.slice(0, 20) + '...')
  },

  captureError(error: Error, extra?: Record<string, unknown>) {
    if (!initialized) return
    console.error('[sentry] error:', error.message, extra || '')
  },

  captureEvent(event: SentryEvent) {
    if (!initialized) return
    const label = event.level === 'error' ? '[sentry]' : '[sentry]'
    console.log(label, event.message, event.tags || '', event.extra || '')
  },

  setUser(userId: string | number) {
    if (!initialized) return
  },

  async flush(timeoutMs = 2000) {
    if (!initialized) return
  },
}

// Auto-init
sentry.init()
