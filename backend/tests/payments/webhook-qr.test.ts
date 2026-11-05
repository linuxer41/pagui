import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createHmac } from 'node:crypto'

// Webhooks salientes sin BD ni red: se verifica que el pago por QR se encola solo para la
// billetera dueña del QR y que la entrega va firmada con la API key sobre el cuerpo crudo.
const leidas: { sql: string; params: any[] }[] = []
const escrituras: { sql: string; params: any[] }[] = []
let webhooksActivos: any[] = []
let jobsPendientes: any[] = []

mock.module('../../src/shared/database/pool', () => ({
  query: async (sql: string, params: any[] = []) => {
    const s = String(sql)
    if (s.includes('FROM outgoing_webhook_jobs j')) return { rowCount: jobsPendientes.length, rows: jobsPendientes }
    if (s.includes('FROM outgoing_webhooks')) { leidas.push({ sql: s, params }); return { rowCount: webhooksActivos.length, rows: webhooksActivos } }
    if (s.includes('INSERT') || s.includes('UPDATE')) { escrituras.push({ sql: s, params }); return { rowCount: 1, rows: [] } }
    return { rowCount: 0, rows: [] }
  },
}))
mock.module('../../src/api-keys/apikey.repository', () => ({
  apikeyRepository: { listByWallet: async () => [{ apiKey: 'sk-demo-123' }] },
}))

const { dispatch, processPendingJobs } = await import('../../src/payments/webhooks/webhook.service')
const { eventBus } = await import('../../src/payments/events/event-bus')

beforeEach(() => {
  leidas.length = 0
  escrituras.length = 0
  jobsPendientes = []
  webhooksActivos = [{ id: '1', wallet_id: '77', url: 'https://comercio.test/hook' }]
})

describe('webhook qr.paid', () => {
  test('se encola solo para la billetera del QR pagado', async () => {
    await dispatch('qr.paid', { qrId: 'QR-1', transactionId: 'txn-comercio', amount: 100 }, '77')

    expect(leidas[0].sql).toContain('wallet_id = $2')
    expect(leidas[0].params).toEqual(['qr.paid', '77'])

    const job = escrituras.find((e) => e.sql.includes('INSERT INTO outgoing_webhook_jobs'))
    expect(job).toBeDefined()
    expect(JSON.parse(job!.params[3]).transactionId).toBe('txn-comercio')
  })

  test('sin billetera el evento sigue llegando a todos los suscriptos', async () => {
    await dispatch('transfer.completed', { transferId: '9' })
    expect(leidas[0].params).toEqual(['transfer.completed', null])
  })

  test('el evento del eventBus llega al webhook registrado', async () => {
    eventBus.emit('qr.paid', { qrId: 'QR-2', walletId: '77', amount: 150, status: 'paid' })
    await new Promise((r) => setTimeout(r, 0))

    const job = escrituras.find((e) => e.sql.includes('INSERT INTO outgoing_webhook_jobs'))
    expect(JSON.parse(job!.params[3]).qrId).toBe('QR-2')
  })

  test('la entrega va firmada con la API key sobre el cuerpo crudo', async () => {
    const payload = JSON.stringify({ qrId: 'QR-3', amount: 200, status: 'paid' })
    jobsPendientes = [{ id: '9', webhook_id: '1', event: 'qr.paid', payload, retry_count: 0, url: 'https://comercio.test/hook', wallet_id: '77' }]

    const pedidos: { url: any; init: any }[] = []
    const fetchReal = globalThis.fetch
    globalThis.fetch = (async (url: any, init: any) => {
      pedidos.push({ url, init })
      return new Response('ok', { status: 200 })
    }) as any

    try {
      await processPendingJobs()
    } finally {
      globalThis.fetch = fetchReal
    }

    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].init.body).toBe(payload)
    expect(pedidos[0].init.headers['X-Webhook-Event']).toBe('qr.paid')
    expect(pedidos[0].init.headers['X-Webhook-Signature']).toBe(
      createHmac('sha256', 'sk-demo-123').update(payload).digest('hex')
    )
  })
})
