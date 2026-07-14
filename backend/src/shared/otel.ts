import { logger } from './logger'

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

export interface Span {
  name: string
  traceId: string
  spanId: string
  parentSpanId?: string
  startTime: number
  endTime?: number
  attributes: Record<string, string | number | boolean>
  status?: 'ok' | 'error'
  error?: string
}

const spans = new Map<string, Span>()

export const tracer = {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
    const span: Span = {
      name,
      traceId: crypto.randomUUID().replace(/-/g, '').slice(0, 32),
      spanId: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
      startTime: Date.now(),
      attributes: attributes || {},
    }
    const key = `${span.traceId}:${span.spanId}`
    spans.set(key, span)
    return span
  },

  endSpan(span: Span, status?: 'ok' | 'error', error?: string) {
    span.endTime = Date.now()
    span.status = status || 'ok'
    span.error = error

    if (endpoint) {
      this.export(span).catch(() => {})
    }

    if (process.env.NODE_ENV === 'development') {
      const duration = span.endTime - span.startTime
      if (duration > 500) {
        logger.warn('Slow span', { name: span.name, durationMs: duration })
      }
    }
  },

  async export(span: Span) {
    if (!endpoint) return
    try {
      await fetch(`${endpoint}/v1/traces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceSpans: [{
            resource: { attributes: [{ key: 'service.name', value: { stringValue: 'pagui-backend' } }] },
            scopeSpans: [{
              scope: { name: 'pagui' },
              spans: [{
                traceId: span.traceId,
                spanId: span.spanId,
                name: span.name,
                startTimeUnixNano: span.startTime * 1_000_000,
                endTimeUnixNano: (span.endTime || Date.now()) * 1_000_000,
                status: span.status === 'error'
                  ? { code: 2, message: span.error || '' }
                  : { code: 1 },
                attributes: Object.entries(span.attributes).map(([k, v]) => ({
                  key: k,
                  value: { [typeof v === 'number' ? 'intValue' : 'stringValue']: String(v) },
                })),
              }],
            }],
          }],
        }),
      })
    } catch {}
  },

  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const span = this.startSpan(name, attributes)
    try {
      const result = await fn()
      this.endSpan(span, 'ok')
      return result
    } catch (err) {
      this.endSpan(span, 'error', String(err))
      throw err
    }
  },
}
