import { sentry } from './sentry'
import * as os from 'node:os'
import crypto from 'node:crypto'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const CURRENT_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

let correlationId = ''

export function setCorrelationId(id: string) {
  correlationId = id
}

const hostname = os.hostname()

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[CURRENT_LEVEL]) return

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    hostname,
    pid: process.pid,
    correlationId: correlationId || undefined,
    ...meta,
  }

  const output = JSON.stringify(entry)

  if (level === 'error') {
    console.error(output)
    if (meta?.error) {
      sentry.captureError(
        meta.error instanceof Error ? meta.error : new Error(String(meta.error)),
        { correlationId, ...meta }
      )
    }
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),

  child: (defaultMeta: Record<string, unknown>) => ({
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, { ...defaultMeta, ...meta }),
    info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, { ...defaultMeta, ...meta }),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, { ...defaultMeta, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, { ...defaultMeta, ...meta }),
  }),

  flush: async () => {
    await sentry.flush()
  },
}

export function requestLoggerMiddleware(app: any) {
  return app.derive(({ request }: { request: Request }) => {
    const id = crypto.randomUUID()
    setCorrelationId(id)
    return { correlationId: id }
  }).onBeforeHandle(({ request }: { request: Request }) => {
    logger.info(`${request.method} ${new URL(request.url).pathname}`, {
      method: request.method,
      path: new URL(request.url).pathname,
    })
  })
}
