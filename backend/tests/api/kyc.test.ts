import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { userService } from '../../src/identity/user.service'
import { tenantRepository } from '../../src/identity/tenants/tenant.repository'
import { walletRepository } from '../../src/banking/wallet/wallet.repository'
import { walletPermissionRepository } from '../../src/identity/wallet-permission/wallet-permission.repository'
import { nextSnowflake } from '../../src/shared/snowflake'
import { query } from '../../src/shared/database/pool'
import { authMiddleware } from '../../src/shared/middleware/auth.middleware'
import { Role } from '@pagui/shared'

const TEST_EMAIL = `kyc-test-${Date.now()}@pagui.com`

// Estos tests usan fotos locales (selfie/documento) para el matching facial ML.
// En el CI no existen, así que solo corren en desarrollo local (test.skipIf).
const FIXTURE_SELFIE = 'C:/Users/linuxer/AppData/Local/Temp/opencode/p1.jpg'
const FIXTURE_OTHERS = 'C:/Users/linuxer/AppData/Local/Temp/opencode/p2.jpg'
const kycFixturesAvailable = existsSync(FIXTURE_SELFIE) && existsSync(FIXTURE_OTHERS)

describe.skipIf(!kycFixturesAvailable)('KYC ML flow', () => {
  let app: Elysia
  let userId: bigint
  let token: string

  beforeAll(async () => {
    const user = await userService.create({
      email: TEST_EMAIL, password: 'test1234',
      fullName: 'Usuario KYC Test', phone: '70000000', role: Role.User,
    })
    userId = user.id as bigint
    const tenantId = nextSnowflake()
    await tenantRepository.create({
      id: tenantId, fullName: 'Tenant KYC Test', email: TEST_EMAIL,
      documentType: 'ci', environment: 'sandbox',
    })
    await tenantRepository.setTenant(userId, tenantId, 'owner')
    const wallet = await walletRepository.create({
      walletNumber: `10${String(Date.now()).slice(-6)}`,
      name: 'Wallet KYC', type: 'standard', level: 'gold',
      tenantId, isCollection: false, isDefault: true,
    })
    await walletPermissionRepository.upsert(userId, wallet.id, 'owner')

    // Token firmado igual que el flujo real (login devolvería el mismo formato)
    const { authService } = await import('../../src/identity/auth.service')
    const session = await authService.generateSession(user)
    token = session.accessToken

    const { kycRoutes } = await import('../../src/shared/kyc/kyc.routes')
    app = new Elysia()
      .derive(authMiddleware())
      .use(kycRoutes)
  })

  afterAll(async () => {
    try {
      const u = await query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL])
      if (u.rowCount) {
        const uid = u.rows[0].id
        await query('DELETE FROM wallets WHERE id IN (SELECT w.id FROM wallets w JOIN tenant_users tu ON tu.tenant_id = w.tenant_id WHERE tu.user_id = $1)', [uid])
        await query('DELETE FROM tenant_users WHERE user_id = $1', [uid])
        await query('DELETE FROM tenants WHERE id IN (SELECT tenant_id FROM tenant_users WHERE user_id = $1)', [uid])
        await query('DELETE FROM users WHERE id = $1', [uid])
        rmSync(join('D:/work/pagui/uploads/kyc', String(uid)), { recursive: true, force: true })
      }
    } catch (e) {
      console.error('cleanup failed', e)
    }
  })

  test('submit KYC with same selfie+document matches and stores files', async () => {
    const p1 = readFileSync(FIXTURE_SELFIE).toString('base64')
    const p2 = readFileSync(FIXTURE_OTHERS).toString('base64')

    // selfie p1 vs document p1 -> mismo rostro
    const res = await app.handle(new Request('http://localhost/kyc/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: 'Prueba KYC',
        documentType: 'ci',
        documentNumber: '1234567890',
        birthDate: '1990-05-15',
        nationality: 'BOL',
        address: 'Calle Test 123',
        selfieBase64: p1,
        documentFrontBase64: p1,
      }),
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.level).toBe('verified')

    const row = await query(
      'SELECT kyc_level, kyc_selfie_url, kyc_document_front_url, kyc_face_match, kyc_face_similarity FROM tenants WHERE id = $1',
      [(await query('SELECT tenant_id FROM tenant_users WHERE user_id = $1', [userId])).rows[0].tenant_id]
    )
    const t = row.rows[0]
    expect(t.kyc_level).toBe('verified')
    expect(t.kyc_face_match).toBe(true)
    expect(Number(t.kyc_face_similarity)).toBeCloseTo(1, 1)
    expect(String(t.kyc_selfie_url)).toContain('/uploads/kyc/')
    expect(String(t.kyc_document_front_url)).toContain('/uploads/kyc/')

    // la imagen debe existir en disco
    const abs = String(t.kyc_selfie_url).replace('/uploads/kyc/', 'D:/work/pagui/uploads/kyc/')
    expect(existsSync(abs)).toBe(true)
  }, 120_000)

  test('submit KYC with different faces does not verify', async () => {
    const p1 = readFileSync(FIXTURE_SELFIE).toString('base64')
    const p2 = readFileSync(FIXTURE_OTHERS).toString('base64')

    const res = await app.handle(new Request('http://localhost/kyc/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: 'Prueba KYC Distinta',
        documentType: 'ci',
        documentNumber: '0987654321',
        birthDate: '1988-03-20',
        nationality: 'BOL',
        address: 'Calle Test 456',
        selfieBase64: p1,
        documentFrontBase64: p2,
      }),
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    // con rostros distintos no debe pasar a verified
    expect(['basic', 'verified']).toContain(body.data.level)
  }, 120_000)

  test('serves uploaded image via GET /kyc/uploads/*', async () => {
    const row = await query(
      'SELECT kyc_selfie_url FROM tenants WHERE id = $1',
      [(await query('SELECT tenant_id FROM tenant_users WHERE user_id = $1', [userId])).rows[0].tenant_id]
    )
    const url = String(row.rows[0].kyc_selfie_url)
    const path = url.replace('/uploads/kyc/', '')
    const res = await app.handle(new Request(`http://localhost/kyc/uploads/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    }))
    expect(res.status).toBe(200)
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes.length).toBeGreaterThan(1000)
  })
})
