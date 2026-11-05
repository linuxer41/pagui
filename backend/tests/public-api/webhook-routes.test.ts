import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { Elysia } from 'elysia'

// src/index.ts ya parcha BigInt para JSON; el test levanta las rutas sueltas, así lo replica.
;(BigInt.prototype as any).toJSON = function () { return String(this) }

// Suscripción a webhooks con API key (sin JWT): la billetera la da la clave y el
// user_id se resuelve desde wallet_permissions, no del cuerpo de la request.
const escrituras: { sql: string; params: any[] }[] = []
const leidas: { sql: string; params: any[] }[] = []
let permissions: Record<string, boolean> = { qr_generate: true }

mock.module('../../src/api-keys/apikey.service', () => ({
  apiKeyService: {
    verifyApiKey: async (key: string) =>
      key === 'sk-demo-123' ? { isValid: true, walletId: 77n, permissions } : { isValid: false },
  },
}))
mock.module('../../src/banking/wallet/wallet.repository', () => ({
  walletRepository: { getCollectionById: async () => ({ id: 77n, isCollection: true }) },
}))
mock.module('../../src/api-keys/apikey.repository', () => ({
  apikeyRepository: { listByWallet: async () => [{ apiKey: 'sk-demo-123' }] },
}))
mock.module('../../src/shared/database/pool', () => ({
  query: async (sql: string, params: any[] = []) => {
    const s = String(sql)
    if (s.includes('FROM wallet_permissions')) { leidas.push({ sql: s, params }); return { rowCount: 1, rows: [{ user_id: 55n }] } }
    if (s.includes('SELECT id, wallet_id')) { leidas.push({ sql: s, params }); return { rowCount: 1, rows: [{ id: '9', walletId: 77n, url: 'https://c.test/hook' }] } }
    if (s.includes('INSERT INTO outgoing_webhooks')) { escrituras.push({ sql: s, params }); return { rowCount: 1, rows: [{ id: '123' }] } }
    if (s.includes('DELETE FROM outgoing_webhooks')) { escrituras.push({ sql: s, params }); return { rowCount: 1, rows: [] } }
    return { rowCount: 0, rows: [] }
  },
}))

const { publicWebhookRoutes } = await import('../../src/public-api/public-webhook.routes')

const app = new Elysia()
  .use(publicWebhookRoutes)
  .onError(({ error, set }) => {
    const e = error as any
    if (typeof e?.statusCode === 'number') {
      set.status = e.statusCode
      return { success: false, error: String(e.message) }
    }
    throw error
  })

function req(path: string, init?: RequestInit) {
  return app.handle(new Request(`http://localhost${path}`, {
    ...init,
    headers: { 'x-api-key': 'sk-demo-123', ...(init?.headers || {}) },
  }))
}

beforeEach(() => {
  escrituras.length = 0
  leidas.length = 0
  permissions = { qr_generate: true }
})

describe('webhooks por API key', () => {
  test('registra con la billetera y el dueño que da la API key', async () => {
    const r = await req('/webhooks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://mis-facturas.test/webhooks/pago/abc', events: ['qr.paid'] }),
    })
    expect(r.status).toBe(200)

    const owner = leidas.find((l) => l.sql.includes('FROM wallet_permissions'))
    expect(owner!.params).toEqual([77n])

    const ins = escrituras.find((e) => e.sql.includes('INSERT INTO outgoing_webhooks'))
    expect(ins).toBeDefined()
    expect(ins!.params[1]).toBe(55n)
    expect(ins!.params[2]).toBe(77n)
    expect(ins!.params[3]).toBe('https://mis-facturas.test/webhooks/pago/abc')
    expect(ins!.params[4]).toEqual(['qr.paid'])
  })

  test('lista acotado a la billetera de la clave', async () => {
    const r = await req('/webhooks')
    expect(r.status).toBe(200)
    const body = (await r.json()) as any
    expect(body.data).toHaveLength(1)
    expect(body.data[0].walletId).toBe('77')

    const select = leidas.find((l) => l.sql.includes('SELECT id, wallet_id'))
    expect(select!.sql).toContain('wallet_id = $2')
    expect(select!.params).toEqual([55n, 77n])
  })

  test('elimina acotado a la billetera de la clave', async () => {
    const r = await req('/webhooks/9', { method: 'DELETE' })
    expect(r.status).toBe(200)
    const del = escrituras.find((e) => e.sql.includes('DELETE FROM outgoing_webhooks'))
    expect(del!.params).toEqual(['9', 55n, 77n])
  })

  test('una clave sin qr_generate no puede suscribirse', async () => {
    permissions = { qr_status: true }
    const r = await req('/webhooks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://mis-facturas.test/hook', events: ['qr.paid'] }),
    })
    expect(r.status).toBe(403)
    expect(escrituras).toHaveLength(0)
  })
})
