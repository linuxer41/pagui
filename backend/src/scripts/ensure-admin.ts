import { Role } from '@pagui/shared'
import { query } from '../shared/database/pool'
import { userService } from '../identity/user.service'
import { logger } from '../shared/logger'

/**
 * Asegura que exista usuario admin. Idempotente — no borra datos.
 * Si no existe admin@pagui.com, lo crea con role Super.
 * Uso: bun run src/scripts/ensure-admin.ts  o  bun run ensure-admin (ver package.json)
 */
export async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@pagui.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123'

  const existing = await query('SELECT id, email, role FROM users WHERE email=$1 AND deleted_at IS NULL', [email])
  if (existing.rowCount) {
    logger.info('Admin ya existe, skip seed', { email, role: existing.rows[0].role, id: String(existing.rows[0].id) })
    return existing.rows[0]
  }

  logger.warn('Admin no encontrado — creando', { email })
  const admin = await userService.create({
    email,
    password,
    fullName: 'Administrador del Sistema',
    phone: '76543210',
    address: 'La Paz, Bolivia',
    role: Role.Super,
  })
  logger.info('Admin creado', { email: admin.email, id: String(admin.id) })

  // También asegura tenant + wallet si no existen (sin sobrescribir)
  const tenantCheck = await query('SELECT id FROM tenants WHERE deleted_at IS NULL LIMIT 1')
  if (!tenantCheck.rowCount) {
    const { tenantRepository } = await import('../identity/tenants/tenant.repository')
    const { walletRepository } = await import('../banking/wallet/wallet.repository')
    const { walletPermissionRepository } = await import('../identity/wallet-permission/wallet-permission.repository')
    const { nextSnowflake } = await import('../shared/snowflake')
    const tid = nextSnowflake()
    await tenantRepository.create({ id: tid, fullName: 'PAGUI Empresarial', email, documentType: 'nit', documentNumber: '1029547027', environment: 'production' })
    await tenantRepository.setTenant(admin.id as unknown as bigint, tid, 'owner')
    const w = await walletRepository.create({ walletNumber: '100013101', name: 'PAGUI Empresarial', type: 'business', level: 'gold', tenantId: tid, isCollection: false, isDefault: true })
    await walletPermissionRepository.upsert(admin.id as unknown as bigint, w.id, 'owner')
    logger.info('Tenant y wallet admin creados', { tenantId: String(tid), walletId: String(w.id) })
  }

  return admin
}

if (import.meta.main) {
  ensureAdmin()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1) })
}
