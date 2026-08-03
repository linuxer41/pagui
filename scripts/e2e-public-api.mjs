// E2E Public API (producción real: pagui-api-public.iathings.com)
//
// Uso:
//   node scripts/e2e-public-api.mjs [API_KEY]
//
// La API key se toma del primer argumento o de la env PAGUI_API_KEY.
// Ejemplo:
//   node scripts/e2e-public-api.mjs pg_11ViqOd2xVlT6Cs4h9rr7eDs5ECUJW2TErBrDTh1
const BASE = process.env.PAGUI_API_URL || 'https://pagui-api-public.iathings.com'
const KEY = process.argv[2] || process.env.PAGUI_API_KEY || 'pg_11ViqOd2xVlT6Cs4h9rr7eDs5ECUJW2TErBrDTh1'

let pass = 0, fail = 0
const results = []

async function req(method, path, { body, key = KEY, expect } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (key !== false) headers['X-API-Key'] = key
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  const ok = expect === undefined ? res.ok : res.status === expect
  if (ok) pass++; else fail++
  results.push({ method, path, status: res.status, ok, expect, body: json })
  return { res, json }
}

const amount = 25.5
const transactionId = 'PROD' + Date.now().toString().slice(-14)
// El server actual usa un default vencido (2025-12-31) si no se envía dueDate,
// por lo que se manda una fecha futura explícita (hoy + 30 días).
const d = new Date(); d.setDate(d.getDate() + 30)
const dueDate = d.toISOString().slice(0, 10)

const gen = await req('POST', '/qr/generate', { body: { amount, transactionId, dueDate }, expect: 200 })
if (!gen.json?.data?.qrId) { console.log('FALLO generar QR', JSON.stringify(gen.json)); process.exit(1) }
const qrId = gen.json.data.qrId
const txOk = gen.json.data.transactionId === transactionId
if (txOk) pass++; else fail++
results.push({ method: 'GEN', path: 'transactionId match', status: gen.json.data.transactionId, ok: txOk })

await req('GET', `/qr/${qrId}`, { expect: 200 })
await req('GET', `/qr/${qrId}/status`, { expect: 200 })
await req('GET', `/qr/${qrId}/payments`, { expect: 200 })
await req('GET', '/qr/list', { expect: 200 })
await req('POST', '/qr/generate', { body: { amount }, key: false, expect: 401 })
await req('POST', '/qr/generate', { body: { amount }, key: 'pg_INVALIDA', expect: 401 })
await req('GET', '/qr/999999999', { expect: 404 })
await req('DELETE', `/qr/${qrId}`, { expect: 403 })
await req('POST', '/qr/generate', { body: {}, expect: 422 })
await req('POST', '/qr/generate', { body: { amount: 0 }, expect: 422 })

console.log('\n==============================')
for (const r of results) {
  if (r.expect === undefined) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.method} ${r.path} [${r.status}]`)
  else console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.method} ${r.path} → esperado ${r.expect}, recibido ${r.status}`)
}
console.log(`\nTOTAL: ${pass} PASS / ${fail} FAIL`)
process.exit(fail > 0 ? 1 : 0)
