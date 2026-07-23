import { Role } from '@pagui/shared'
import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'
import { userService } from '../identity/user.service'
import { tenantRepository } from '../identity/tenants/tenant.repository'
import { walletRepository } from '../banking/wallet/wallet.repository'
import { walletPermissionRepository } from '../identity/wallet-permission/wallet-permission.repository'
import { logger } from '../shared/logger'

export async function seedMinimal() {
  logger.info('Minimal seed started')

  const bankData = [
    { code: '001', name: 'Mercantil Santa Cruz' },
    { code: '002', name: 'BNB' },
    { code: '003', name: 'BCP / Crédito de Bolivia' },
    { code: '005', name: 'Bisa' },
    { code: '006', name: 'Unión' },
    { code: '007', name: 'Económico' },
    { code: '008', name: 'Solidario' },
    { code: '009', name: 'Ganadero' },
    { code: '044', name: 'PYME de la Comunidad' },
    { code: '045', name: 'FIE' },
    { code: '047', name: 'Ecofuturo' },
    { code: '049', name: 'Fortaleza' },
    { code: '052', name: 'Nación Argentina' },
  ]
  for (const b of bankData) {
    await query(`
      INSERT INTO banks (id, code, name) VALUES ($1, $2, $3)
      ON CONFLICT (code) DO NOTHING
    `, [nextSnowflake(), b.code, b.name])
  }
  logger.info('Banks created')

  const adminUser = await userService.create({
    email: 'admin@pagui.com', password: 'admin123',
    fullName: 'Administrador del Sistema', phone: '76543210',
    address: 'La Paz, Bolivia', role: Role.Super,
  })
  logger.info('Admin user created', { email: adminUser.email })

  const tenantId = nextSnowflake()
  await tenantRepository.create({
    id: tenantId, fullName: 'PAGUI Empresarial', email: 'admin@pagui.com',
    documentType: 'nit', documentNumber: '1029547027', environment: 'production',
  })
  await tenantRepository.setTenant(adminUser.id, tenantId, 'owner')
  logger.info('Admin tenant created')

  const wallet = await walletRepository.create({
    walletNumber: '100013101', name: 'PAGUI Empresarial',
    type: 'business', level: 'gold',
    tenantId, isCollection: false, isDefault: true,
  })
  await walletPermissionRepository.upsert(adminUser.id, wallet.id, 'owner')
  logger.info('Admin wallet created')

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'pg_'
  for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  await query(`
    INSERT INTO api_keys (id, api_key, wallet_id, description, permissions, status)
    VALUES ($1, $2, $3, $4, $5, 'active')
    ON CONFLICT (api_key) DO NOTHING
  `, [nextSnowflake(), key, wallet.id, 'API Key admin', JSON.stringify({ qr_generate: true, qr_status: true, qr_cancel: true })])
  logger.info('API key created')

  logger.info('Minimal seed completed')
}
