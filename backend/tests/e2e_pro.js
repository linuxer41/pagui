// E2E standalone — PAGUI Wallet (PRO / credenciales reales Baneco)
// Uso: node tests/e2e_pro.js
// Requiere el servidor corriendo (npm run dev / bun run dev).
// Opcional: E2E_BASE_URL=http://localhost:3000 E2E_PUBLIC_URL=http://localhost:3001
//
// Dos grupos grandes:
//   GRUPO 1 — JWT      : flujo como la app (login, wallets, transferencias, admin)
//   GRUPO 2 — API KEY  : flujo como integración externa (Public API con X-API-Key)
//
// DIFERENCIA vs e2e.js:
//   La wallet de recaudación se crea con /collection/setup usando CREDENCIALES REALES
//   de Baneco (cliente), quedando vinculada a la credencial del cliente.
//   El QR por tanto se genera contra Baneco con esas credenciales, no con el gateway.

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
const PUBLIC = process.env.E2E_PUBLIC_URL || 'http://localhost:3001'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@pagui.com'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'admin123'

// Credenciales reales Baneco (cliente PRO)
const BANECO_CREDENTIALS = {
  accountHolder: 'Claudia',
  accountNumber: '5111262121',
  username: 'A122002550',
  password: 'Provi7609',
  encryptionKey: 'DDCA7AF54EAE4891A527FACD9EE19064',
  commissionRate: 0.1,
}

const groups = {}
const state = {
  adminToken: null,
  userToken: null,
  userId: null,
  tenantId: null,
  walletId: null,
  walletNumber: null,
  credentialId: null,
  bankAccountId: null,
  apiKey: null,
  qrId: null,
  transferId: null,
  senderWalletId: null,
  senderWalletNumber: null,
  receiverToken: null,
  receiverUserId: null,
  receiverWalletNumber: null,
  restrictedApiKey: null,
}

async function api(path, { method = 'GET', token, apiKey, body } = {}) {
  const isPublic = path.startsWith('/public')
  const base = isPublic ? PUBLIC : BASE
  const clean = isPublic ? path.replace('/public', '') : path
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (apiKey) headers['X-API-Key'] = apiKey
  const res = await fetch(`${base}${clean}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, ok: res.ok, json }
}

function ok(group, name, detail) {
  groups[group].passed++
  console.log(`  PASS  [${group}] ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(group, name, detail) {
  groups[group].failed++
  console.log(`  FAIL  [${group}] ${name} — ${detail}`)
}

function skip(group, name, detail) {
  groups[group].skipped++
  console.log(`  SKIP  [${group}] ${name} — ${detail}`)
}

async function main() {
  const ts = Date.now()
  const email = `e2epro_${ts}@pagui.com`
  console.log(`\n[E2E PRO] ${new Date().toISOString()} — usuario: ${email}`)
  console.log(`[E2E PRO] Main API: ${BASE} | Public API: ${PUBLIC}`)
  console.log(`[E2E PRO] Credencial Baneco: cuenta ${BANECO_CREDENTIALS.accountNumber} / user ${BANECO_CREDENTIALS.username}\n`)

  // ============================================================
  // GRUPO 1 — JWT (flujo como la app)
  // ============================================================
  groups.jwt = { passed: 0, failed: 0, skipped: 0 }
  console.log('\n== GRUPO 1: JWT (flujo como la app) ==')

  // 1. Health
  {
    const { status, json } = await api('/health')
    if (status === 200 && json.success && json.data.status === 'ok') ok('jwt', 'health check')
    else fail('jwt', 'health check', `status=${status} body=${JSON.stringify(json).slice(0, 120)}`)
  }

  // 2. Registro por email (solicitud) — no requiere WhatsApp
  {
    const { status, json } = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'E2E Pro Demo', email, company: 'Empresa E2E Pro', phone: '79123456', message: 'alta e2e pro' },
    })
    if (status === 200 && json.success && json.data.id) ok('jwt', 'registro por email (solicitud)', `id=${json.data.id}`)
    else fail('jwt', 'registro por email (solicitud)', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 3. Login admin
  {
    const { status, json } = await api('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASS } })
    if (status === 200 && json.success && json.data.accessToken) {
      state.adminToken = json.data.accessToken
      ok('jwt', 'login admin', `role=${json.data.user?.role}`)
    } else fail('jwt', 'login admin', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 4. Admin crea usuario real
  {
    const { status, json } = await api('/admin/users', {
      method: 'POST',
      token: state.adminToken,
      body: { email, password: 'e2e12345', fullName: 'E2E Pro Demo', phone: '79123456', role: 3 },
    })
    if (status === 200 && json.success && json.data.id) {
      state.userId = String(json.data.id)
      ok('jwt', 'admin crea usuario', `userId=${state.userId}`)
    } else fail('jwt', 'admin crea usuario', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 5. Login del usuario creado
  {
    const { status, json } = await api('/auth/login', { method: 'POST', body: { email, password: 'e2e12345' } })
    if (status === 200 && json.success && json.data.accessToken) {
      state.userToken = json.data.accessToken
      ok('jwt', 'login usuario (sesión de wallets)', `wallets=${Array.isArray(json.data.wallets) ? json.data.wallets.length : 'n/a'}`)
    } else fail('jwt', 'login usuario', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 5b. Crear usuario receptor para P2P
  {
    const recEmail = `recpro_${ts}@pagui.com`
    const { status, json } = await api('/admin/users', {
      method: 'POST',
      token: state.adminToken,
      body: { email: recEmail, password: 'e2e12345', fullName: 'Receptor E2E Pro', phone: '79123457', role: 3 },
    })
    if (status === 200 && json.success && json.data.id) {
      state.receiverUserId = String(json.data.id)
      const login = await api('/auth/login', { method: 'POST', body: { email: recEmail, password: 'e2e12345' } })
      if (login.status === 200 && login.json.success && login.json.data.accessToken) {
        state.receiverToken = login.json.data.accessToken
        ok('jwt', 'crear usuario receptor (P2P)', `userId=${state.receiverUserId}`)
      } else {
        state.receiverUserId = null
        fail('jwt', 'crear usuario receptor (P2P)', `login falló status=${login.status}`)
      }
    } else fail('jwt', 'crear usuario receptor (P2P)', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 5c. Wallet estándar del receptor
  if (state.receiverToken) {
    const { status, json } = await api('/wallets', {
      method: 'POST',
      token: state.receiverToken,
      body: { name: 'Wallet Receptor E2E Pro', type: 'standard', currency: 'BOB' },
    })
    if (status === 200 && json.success && json.data.id) {
      state.receiverWalletNumber = String(json.data.walletNumber)
      ok('jwt', 'crear wallet receptor', `walletNumber=${state.receiverWalletNumber}`)
    } else fail('jwt', 'crear wallet receptor', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('jwt', 'crear wallet receptor', 'sin token de receptor')

  // 6. Crear cliente (barril / tenant) — environment default 'production'
  {
    const { status, json } = await api('/tenants', {
      method: 'POST',
      token: state.userToken,
      body: { fullName: 'Cliente E2E Pro', email, phone: '79123456', documentType: 'nit', documentNumber: '123456' + ts.toString().slice(-4) },
    })
    if (status === 200 && json.success && json.data.id) {
      state.tenantId = String(json.data.id)
      ok('jwt', 'crear cliente (tenant)', `tenantId=${state.tenantId}`)
    } else fail('jwt', 'crear cliente (tenant)', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 7. Listar clientes
  {
    const { status, json } = await api('/tenants', { token: state.userToken })
    if (status === 200 && json.success && json.data.some(t => String(t.id) === state.tenantId)) ok('jwt', 'listar clientes')
    else fail('jwt', 'listar clientes', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 8. Setup completo de recaudación con credenciales REALES de Baneco
  //    Crea credencial + wallet vinculada + collection_config en una transacción.
  {
    const { status, json } = await api('/collection/setup', {
      method: 'POST',
      token: state.userToken,
      body: BANECO_CREDENTIALS,
    })
    if (status === 200 && json.success && json.data.wallet && json.data.credential) {
      state.walletId = String(json.data.wallet.id)
      state.credentialId = String(json.data.credential.id)
      ok('jwt', 'setup recaudación (credenciales reales Baneco)',
        `walletId=${state.walletId} credId=${state.credentialId} env=${json.data.credential.environment}`)
    } else fail('jwt', 'setup recaudación (credenciales reales Baneco)', `status=${status} body=${JSON.stringify(json).slice(0, 250)}`)
  }

  // 9. Obtener wallet de recaudación en sesión (banecoCredentialId vinculada)
  if (state.walletId) {
    const { status, json } = await api('/wallets/collection', { token: state.userToken })
    if (status === 200 && json.success && String(json.data.id) === state.walletId) {
      state.walletNumber = String(json.data.walletNumber || '')
      const linked = String(json.data.banecoCredentialId || '') === state.credentialId
      if (linked) ok('jwt', 'wallet de recaudación vinculada a credencial', `walletNumber=${state.walletNumber}`)
      else fail('jwt', 'wallet de recaudación vinculada a credencial', `banecoCredentialId=${json.data.banecoCredentialId}`)
    } else fail('jwt', 'obtener wallet de recaudación', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 10. Listar credenciales propias
  if (state.credentialId) {
    const { status, json } = await api('/baneco-credentials', { token: state.userToken })
    if (status === 200 && json.success && json.data.some(c => String(c.id) === state.credentialId)) ok('jwt', 'listar credenciales')
    else fail('jwt', 'listar credenciales', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 11. Crear cuenta bancaria propia
  {
    const { status, json } = await api('/bank-accounts', {
      method: 'POST',
      token: state.userToken,
      body: { bankCode: '007', accountHolder: 'Claudia', accountNumber: '5111262121', holderDocument: '1234567' },
    })
    if (status === 200 && json.success && json.data.id) {
      state.bankAccountId = String(json.data.id)
      ok('jwt', 'crear cuenta bancaria', `bankAccountId=${state.bankAccountId}`)
    } else fail('jwt', 'crear cuenta bancaria', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 12. Config de recaudación (direct, con la credencial real)
  if (state.walletId && state.credentialId) {
    const { status, json } = await api('/collection/config', {
      method: 'POST',
      token: state.userToken,
      body: { banecoCredentialId: state.credentialId, bankAccountId: state.bankAccountId, collectionType: 'direct', commissionRate: 0.1 },
    })
    if (status === 200 && json.success && String(json.data.banecoCredentialId) === state.credentialId) ok('jwt', 'config de recaudación')
    else fail('jwt', 'config de recaudación', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('jwt', 'config de recaudación', 'sin wallet/credencial')

  // 13. Generar API key para wallet de recaudación (aún con JWT, es la app la que la emite)
  if (state.walletId) {
    const { status, json } = await api('/api-keys', {
      method: 'POST',
      token: state.userToken,
      body: { walletId: state.walletId, description: 'API key E2E Pro', permissions: { qr_generate: true, qr_status: true, qr_cancel: true } },
    })
    if (status === 200 && json.success && json.data.apiKey) {
      state.apiKey = json.data.apiKey
      ok('jwt', 'generar API key', `apiKey=${String(json.data.apiKey).slice(0, 12)}…`)
    } else fail('jwt', 'generar API key', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('jwt', 'generar API key', 'sin wallet de recaudación')

  // 13b. API key restringida (sin permisos) para probar 403
  if (state.walletId) {
    const { status, json } = await api('/api-keys', {
      method: 'POST',
      token: state.userToken,
      body: { walletId: state.walletId, description: 'API key restringida E2E Pro', permissions: {} },
    })
    if (status === 200 && json.success && json.data.apiKey) {
      state.restrictedApiKey = json.data.apiKey
      ok('jwt', 'generar API key restringida', `apiKey=${String(json.data.apiKey).slice(0, 12)}…`)
    } else fail('jwt', 'generar API key restringida', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('jwt', 'generar API key restringida', 'sin wallet de recaudación')

  // 14. Crear wallet estándar para P2P
  {
    const { status, json } = await api('/wallets', {
      method: 'POST',
      token: state.userToken,
      body: { name: 'Wallet P2P E2E Pro', type: 'standard', currency: 'BOB' },
    })
    if (status === 200 && json.success && json.data.id) {
      state.senderWalletId = String(json.data.id)
      state.senderWalletNumber = String(json.data.walletNumber)
      ok('jwt', 'crear wallet estándar', `walletId=${state.senderWalletId}`)
    } else fail('jwt', 'crear wallet estándar', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 15. Acreditar saldo vía admin
  if (state.senderWalletId) {
    const { status, json } = await api(`/admin/wallets/${state.senderWalletId}/credit`, {
      method: 'POST',
      token: state.adminToken,
      body: { amount: 100, description: 'Abono E2E Pro' },
    })
    if (status === 200 && json.success && parseFloat(json.data.newBalance) >= 100) ok('jwt', 'acreditar saldo (admin)')
    else fail('jwt', 'acreditar saldo (admin)', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('jwt', 'acreditar saldo (admin)', 'sin wallet estándar')

  // 16. Transferencia P2P (emisor → receptor)
  if (state.senderWalletNumber && state.receiverWalletNumber) {
    const { status, json } = await api('/transfers/p2p', {
      method: 'POST',
      token: state.userToken,
      body: { senderWalletId: state.senderWalletId, receiverWalletNumber: state.receiverWalletNumber, amount: 30, description: 'P2P E2E Pro' },
    })
    if (status === 200 && json.success && json.data.id) {
      state.transferId = String(json.data.id)
      ok('jwt', 'transferencia P2P', `transferId=${state.transferId}`)
    } else fail('jwt', 'transferencia P2P', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('jwt', 'transferencia P2P', 'faltan wallets')

  // 17. Historial de transferencias (del emisor)
  if (state.transferId) {
    const { status, json } = await api('/transfers?walletId=' + state.senderWalletId, { token: state.userToken })
    if (status === 200 && json.success && json.data.some(x => String(x.id) === state.transferId)) ok('jwt', 'historial de transferencias')
    else fail('jwt', 'historial de transferencias', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('jwt', 'historial de transferencias', 'sin transferencia previa')

  // 18. Transacciones y stats
  if (state.walletId) {
    const tr = await api('/transactions?walletId=' + state.walletId, { token: state.userToken })
    const stats = await api('/transactions/stats/monthly/2026/8?walletId=' + state.walletId, { token: state.userToken })
    if (tr.status === 200 && tr.json.success && stats.status === 200 && stats.json.success) ok('jwt', 'transacciones y stats')
    else fail('jwt', 'transacciones y stats', `tr=${tr.status} stats=${stats.status}`)
  } else skip('jwt', 'transacciones y stats', 'sin wallet de recaudación')

  // 19. Dashboard admin
  {
    const { status, json } = await api('/admin/stats', { token: state.adminToken })
    if (status === 200 && json.success && json.data.users && json.data.tenants && json.data.wallets) ok('jwt', 'dashboard admin (stats)')
    else fail('jwt', 'dashboard admin (stats)', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 20. Detalle del usuario vía admin (tenant + wallets)
  if (state.userId && state.walletId) {
    const { status, json } = await api(`/admin/users/${state.userId}`, { token: state.adminToken })
    if (status === 200 && json.success && json.data.tenants.some(t => String(t.id) === state.tenantId) && json.data.wallets.some(w => String(w.id) === state.walletId)) {
      ok('jwt', 'detalle de usuario vía admin (tenant + wallets)')
    } else fail('jwt', 'detalle de usuario vía admin', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  }

  // 21. Permisos del wallet (owner)
  if (state.walletId) {
    const { status, json } = await api(`/admin/wallets/${state.walletId}/permissions`, { token: state.adminToken })
    const mine = json?.data?.items?.find(p => String(p.userId) === state.userId)
    if (status === 200 && json.success && mine && mine.role === 'owner') ok('jwt', 'permisos del wallet (owner)')
    else fail('jwt', 'permisos del wallet (owner)', `status=${status} mine=${JSON.stringify(mine)}`)
  }

  // ============================================================
  // GRUPO 2 — API KEY (flujo como integración externa)
  // ============================================================
  groups.apikey = { passed: 0, failed: 0, skipped: 0 }
  console.log('\n== GRUPO 2: API KEY (integración externa) ==')

  // 22. Generar QR contra Baneco con las credenciales REALES del cliente
  if (state.apiKey) {
    try {
      const { status, json } = await api('/public/qr/generate', {
        method: 'POST',
        apiKey: state.apiKey,
        body: { amount: 25.5, description: 'Pago E2E Pro QR', singleUse: true, transactionId: `TXN_PRO_${ts}` },
      })
      if (status === 200 && json.success && json.data.qrId) {
        state.qrId = json.data.qrId
        if (json.data.transactionId === `TXN_PRO_${ts}`) ok('apikey', 'generar QR con credenciales reales + transactionId propio', `qrId=${state.qrId} tx=${json.data.transactionId}`)
        else fail('apikey', 'generar QR con credenciales reales + transactionId propio', `transactionId no respetado=${json.data.transactionId}`)
      } else if (status === 502) {
        skip('apikey', 'generar QR (Public API)', 'Baneco no respondió (502)')
      } else {
        const detail = typeof json === 'object' ? JSON.stringify(json).slice(0, 250) : String(json).slice(0, 250)
        fail('apikey', 'generar QR (Public API)', `status=${status} body=${detail}`)
      }
    } catch (e) {
      skip('apikey', 'generar QR (Public API)', `excepción de red: ${e.message}`)
    }
  } else skip('apikey', 'generar QR (Public API)', 'sin apiKey (no se generó en grupo JWT)')

  // 23. Estado del QR
  if (state.qrId) {
    const { status, json } = await api(`/public/qr/${state.qrId}/status`, { apiKey: state.apiKey })
    if (status === 200 && json.success && json.data.qrId === state.qrId) ok('apikey', 'estado del QR (Public API)')
    else fail('apikey', 'estado del QR (Public API)', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('apikey', 'estado del QR (Public API)', 'sin qrId previo')

  // 24. Listar QR con API key
  if (state.apiKey) {
    const { status, json } = await api('/public/qr/list', { apiKey: state.apiKey })
    if (status === 200 && json.success && (state.qrId ? json.data.some(q => String(q.qrId) === state.qrId) : true)) ok('apikey', 'listar QR (Public API)')
    else fail('apikey', 'listar QR (Public API)', `status=${status} body=${JSON.stringify(json).slice(0, 200)}`)
  } else skip('apikey', 'listar QR (Public API)', 'sin apiKey')

  // 25. Rechazo con API key inválida
  {
    const { status, json } = await api('/public/qr/list', { apiKey: 'pg_invalida_e2e' })
    if (status === 401) ok('apikey', 'rechaza API key inválida')
    else fail('apikey', 'rechaza API key inválida', `status=${status} body=${JSON.stringify(json).slice(0, 120)}`)
  }

  // 26. Sin API key → 401
  {
    const { status } = await api('/public/qr/list')
    if (status === 401) ok('apikey', 'rechaza sin API key')
    else fail('apikey', 'rechaza sin API key', `status=${status}`)
  }

  // 27. API key sin permisos → 403 (qr_status)
  if (state.restrictedApiKey) {
    const { status, json } = await api('/public/qr/list', { apiKey: state.restrictedApiKey })
    if (status === 403) ok('apikey', 'API key sin permiso qr_status → 403')
    else fail('apikey', 'API key sin permiso qr_status → 403', `status=${status} body=${JSON.stringify(json).slice(0, 120)}`)
  } else skip('apikey', 'API key sin permiso qr_status → 403', 'sin restrictedApiKey')

  // 28. Detalle QR inexistente → 404
  {
    const { status, json } = await api('/public/qr/qr_inexistente_e2e', { apiKey: state.apiKey })
    if (status === 404) ok('apikey', 'detalle QR inexistente → 404')
    else fail('apikey', 'detalle QR inexistente → 404', `status=${status} body=${JSON.stringify(json).slice(0, 120)}`)
  }

  // 29. Cancelar QR por ID inexistente
  if (state.apiKey) {
    const { status, json } = await api('/public/qr/cancelQR', {
      method: 'DELETE',
      apiKey: state.apiKey,
      body: { qrId: 'qr_inexistente_e2e' },
    })
    if (status === 404) ok('apikey', 'cancelar QR inexistente → 404')
    else fail('apikey', 'cancelar QR inexistente → 404', `status=${status} body=${JSON.stringify(json).slice(0, 120)}`)
  } else skip('apikey', 'cancelar QR inexistente → 404', 'sin apiKey')

  // ============================================================
  // Resumen por grupo
  // ============================================================
  console.log('\n[E2E PRO] Resultados por grupo:')
  const totals = { passed: 0, failed: 0, skipped: 0 }
  for (const [name, g] of Object.entries(groups)) {
    totals.passed += g.passed
    totals.failed += g.failed
    totals.skipped += g.skipped
    const label = name === 'jwt' ? 'GRUPO 1 (JWT)' : 'GRUPO 2 (API KEY)'
    console.log(`  ${label}: ${g.passed} PASS, ${g.failed} FAIL, ${g.skipped} SKIP`)
  }
  console.log(`\n[E2E PRO] Total: ${totals.passed} PASS, ${totals.failed} FAIL, ${totals.skipped} SKIP\n`)
  process.exit(totals.failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('[E2E PRO] Error fatal:', e)
  process.exit(1)
})
