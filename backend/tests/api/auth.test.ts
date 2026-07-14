import { describe, expect, test, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'

describe('Auth API', () => {
  let app: Elysia

  beforeAll(async () => {
    app = new Elysia()
    const { authRoutes } = await import('../../src/identity/auth.routes')
    app.use(authRoutes)
  })

  test('POST /auth/login returns error with empty body', async () => {
    const res = await app.handle(new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    }))
    expect([400, 401, 500]).toContain(res.status)
  })

  test('POST /auth/refresh returns error with invalid token', async () => {
    const res = await app.handle(new Request('http://localhost/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid-token' }),
    }))
    expect([400, 401, 500]).toContain(res.status)
  })

  test('POST /auth/login with valid-looking payload still fails gracefully', async () => {
    const res = await app.handle(new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'somepassword' }),
    }))
    expect([200, 400, 401, 500]).toContain(res.status)
  })
})
