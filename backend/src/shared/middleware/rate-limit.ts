import { Elysia } from 'elysia'
import { AppError } from '../errors/app-error'
import { logger } from '../logger'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function rateLimit(options: { windowMs?: number; maxRequests?: number } = {}) {
  const windowMs = options.windowMs || 60_000
  const maxRequests = options.maxRequests || 60

  return new Elysia({ name: 'rateLimit' })
    .derive({ as: 'scoped' }, async (ctx) => {
      const ip = ctx.headers['x-forwarded-for'] as string ||
                 ctx.headers['cf-connecting-ip'] as string ||
                 'unknown'
      const key = `rl:${ip}:${Math.floor(Date.now() / windowMs)}`
      const now = Date.now()
      let entry = store.get(key)

      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs }
        store.set(key, entry)
      }

      entry.count++

      if (entry.count > maxRequests) {
        logger.warn('Rate limit exceeded', { ip, count: entry.count, maxRequests })
        throw new AppError(429, 'Demasiadas solicitudes. Intente más tarde.')
      }

      return {}
    })
}

export function resetRateLimitStore() {
  store.clear()
}
