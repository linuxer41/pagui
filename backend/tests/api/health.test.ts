import { describe, expect, test, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'

describe('Health API', () => {
  let app: Elysia

  beforeAll(async () => {
    app = new Elysia()
    const { healthRoutes } = await import('../../src/monitoring/health.controller')
    app.use(healthRoutes)
  })

  test('GET /health returns OK', async () => {
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('ok')
  })

  test('GET /health/api returns DB status', async () => {
    const res = await app.handle(new Request('http://localhost/health/api'))
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('database')
  })
})
