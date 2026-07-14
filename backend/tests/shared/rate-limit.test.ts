import { describe, expect, test } from 'bun:test'
import { rateLimit, resetRateLimitStore } from '../../src/shared/middleware/rate-limit'

describe('Rate limiting', () => {
  test('basic configuration', () => {
    const mw = rateLimit({ windowMs: 1000, maxRequests: 5 })
    expect(mw).toBeDefined()
  })

  test('reset store', () => {
    resetRateLimitStore()
    const mw = rateLimit({ windowMs: 1000, maxRequests: 5 })
    expect(mw).toBeDefined()
  })

  test('different limits', () => {
    const mw1 = rateLimit({ windowMs: 60_000, maxRequests: 10 })
    const mw2 = rateLimit({ windowMs: 60_000, maxRequests: 120 })
    expect(mw1).toBeDefined()
    expect(mw2).toBeDefined()
    resetRateLimitStore()
  })
})
