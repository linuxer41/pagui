import pino from 'pino'
import { sentry } from './sentry'
import crypto from 'node:crypto'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const level = process.env.LOG_LEVEL || 'info'
const isDev = process.env.NODE_ENV !== 'production'

const pinoLogger = pino({
  level,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname,correlationId',
        messageFormat: '{msg} {if correlationId}[{correlationId}]{end}',
      },
    },
  }),
  serializers: {
    error: pino.stdSerializers.err,
  },
})

let correlationId = ''

export function setCorrelationId(id: string) {
  correlationId = id
}

function log(level: string, message: string, meta?: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...meta, correlationId: correlationId || undefined }

  if (data.error instanceof Error) {
    const err = data.error as Error
    delete data.error
    pinoLogger[level]({ err, ...data }, message)
    if (level === 'error' || level === 'fatal') {
      sentry.captureError(err, data)
    }
  } else if (data.error) {
    const errStr = String(data.error)
    delete data.error
    pinoLogger[level]({ ...data }, `${message} — ${errStr}`)
    if (level === 'error' || level === 'fatal') {
      sentry.captureError(new Error(errStr), data)
    }
  } else {
    pinoLogger[level](data, message)
  }
}

function wrapLogger(defaultMeta?: Record<string, unknown>) {
  const withMeta = (msg: string, meta?: Record<string, unknown>) =>
    defaultMeta ? { ...defaultMeta, ...meta } : meta

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, withMeta(msg, meta)),
    info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, withMeta(msg, meta)),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, withMeta(msg, meta)),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, withMeta(msg, meta)),
  }
}

export const logger = {
  ...wrapLogger(),

  child: (defaultMeta: Record<string, unknown>) => wrapLogger(defaultMeta),

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
