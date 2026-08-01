import { Role } from '@pagui/shared'
import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'
import { userService } from '../identity/user.service'
import { tenantRepository } from '../identity/tenants/tenant.repository'
import { walletRepository } from '../banking/wallet/wallet.repository'
import { walletPermissionRepository } from '../identity/wallet-permission/wallet-permission.repository'
import { logger } from '../shared/logger'

export async function seedDatabase() {
  logger.info('Seeding database')

  // 1. Banks
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

  // 3. Users
  const users = [
    { email: 'admin@pagui.com', password: 'admin123', fullName: 'Administrador del Sistema', phone: '76543210', address: 'La Paz, Bolivia', role: Role.Super },
    { email: 'usuario@example.com', password: 'usuario123', fullName: 'Usuario Demo', phone: '65432109', address: 'Santa Cruz, Bolivia', role: Role.User },
    { email: 'gerente@example.com', password: 'gerente123', fullName: 'Gerente Demo', phone: '55555555', address: 'Cochabamba, Bolivia', role: Role.Manager },
    { email: 'iathings@example.com', password: 'iathings123', fullName: 'IATHINGS EMPRESARIAL', phone: '77777777', address: 'La Paz, Bolivia', role: Role.Manager },
  ]

  const createdUsers: any[] = []
  for (const u of users) {
    try {
      const user = await userService.create(u)
      createdUsers.push(user)
      logger.info('User created', { email: u.email })
    } catch (e: any) {
      logger.warn('User skipped', { email: u.email, error: e.message })
    }
  }

  // 4. Tenants (one per user) + link via tenant_users
  const tenantConfigs = [
    { fullName: 'PAGUI Empresarial', email: 'admin@pagui.com', userId: createdUsers[0]?.id, documentType: 'nit', documentNumber: '1029547027', environment: 'production' },
    { fullName: 'Usuario Demo', email: 'usuario@example.com', userId: createdUsers[1]?.id, documentType: 'ci', documentNumber: '12345678', environment: 'production' },
    { fullName: 'Gerencia Demo', email: 'gerente@example.com', userId: createdUsers[2]?.id, documentType: 'ci', documentNumber: '87654321', environment: 'production' },
    { fullName: 'IATHINGS EMPRESARIAL', email: 'iathings@example.com', userId: createdUsers[3]?.id, documentType: 'nit', documentNumber: '1029547028', environment: 'production' },
  ]

  for (const tc of tenantConfigs) {
    if (!tc.userId) continue
    const tenantId = nextSnowflake()
    await tenantRepository.create({
      id: tenantId, fullName: tc.fullName, email: tc.email,
      documentType: tc.documentType, documentNumber: tc.documentNumber,
      environment: tc.environment,
    })
    await tenantRepository.setTenant(tc.userId, tenantId, 'owner')
    logger.info('Tenant created', { fullName: tc.fullName, tenantId })
  }
  logger.info('Tenants created')

  // 5. Wallets (linked to tenants via tenant_id)
  const storedTenants = await query('SELECT id FROM tenants WHERE deleted_at IS NULL')
  const walletConfigs = [
    { walletNumber: '100013101', name: 'PAGUI Empresarial', type: 'business', level: 'gold', tenantIdx: 0 },
    { walletNumber: '100013102', name: 'PAGUI Ahorros', type: 'standard', level: 'silver', tenantIdx: 0 },
    { walletNumber: '100013105', name: 'PAGUI Inversiones', type: 'business', level: 'gold', tenantIdx: 0 },
    { walletNumber: '100011102', name: 'Mi Cuenta Principal', type: 'standard', level: 'bronze', tenantIdx: 1 },
    { walletNumber: '100013103', name: 'Gerencia', type: 'business', level: 'silver', tenantIdx: 2 },
    { walletNumber: '100013104', name: 'IATHINGS Corporativo', type: 'business', level: 'gold', tenantIdx: 3 },
    { walletNumber: '400015001', name: 'Collection', type: 'standard', level: 'bronze', isCollection: true, tenantIdx: 1 },
    { walletNumber: '400015002', name: 'PAGUI Collection', type: 'standard', level: 'bronze', isCollection: true, tenantIdx: 0 },
  ]

  const createdWallets: any[] = []
  for (const wc of walletConfigs) {
    const tenant = storedTenants.rows[wc.tenantIdx]
    if (!tenant) continue
    const w = await walletRepository.create({
      walletNumber: wc.walletNumber, name: wc.name, type: wc.type,
      level: wc.level, banecoCredentialId: wc.banecoCredentialId,
      tenantId: tenant.id, isCollection: wc.isCollection || false, isDefault: true,
    })
    createdWallets.push(w)
    // Grant permission to the owner user
    const ut = await query(
      'SELECT user_id FROM tenant_users WHERE tenant_id = $1 LIMIT 1',
      [tenant.id]
    )
    if (ut.rowCount) {
      await walletPermissionRepository.upsert(ut.rows[0].user_id, w.id, 'owner')
    }
    logger.info('Wallet created', { walletNumber: wc.walletNumber, type: wc.type, name: wc.name })
  }

  // 6. Collection config
  const collectionWallets = await query(`
    SELECT id as wallet_id FROM wallets
    WHERE is_collection = true AND deleted_at IS NULL
  `)
  for (const row of collectionWallets.rows) {
    await query(`
      INSERT INTO collection_config (id, wallet_id, use_default, is_active)
      VALUES ($1, $2, true, true) ON CONFLICT DO NOTHING
    `, [nextSnowflake(), row.wallet_id])
  }
  logger.info('Collection configs created')

  // 7. API keys
  const storedWallets = await query('SELECT id FROM wallets WHERE deleted_at IS NULL')
  for (const row of storedWallets.rows) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let key = 'pg_'
    for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
    await query(`
      INSERT INTO api_keys (id, api_key, wallet_id, description, permissions, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      ON CONFLICT (api_key) DO NOTHING
    `, [nextSnowflake(), key, row.id, `API Key wallet ${row.id}`, JSON.stringify({ qr_generate: true, qr_status: true, qr_cancel: true })])
  }
  logger.info('API keys created')

  // ── 10. Transactions & Movements ──
  const W = createdWallets
  const txId = (prefix: string, n: number) => `TXN${prefix}${nextSnowflake().toString().slice(-8)}`

  async function addMovement(walletIdx: number, type: string, amount: number, opts: {
    description?: string, refType?: string, refId?: string, daysAgo?: number
    senderName?: string, senderDoc?: string, senderAccount?: string, senderBank?: string
  } = {}) {
    const w = W[walletIdx]
    if (!w) return
    const bal = await query('SELECT balance FROM wallets WHERE id = $1', [w.id])
    const balBefore = parseFloat(bal.rows[0]?.balance || '0')
    const balAfter = type === 'deposit' || type === 'transfer_in' || type === 'qr_payment'
      ? balBefore + amount : balBefore - amount
    const d = opts.daysAgo ? new Date(Date.now() - opts.daysAgo * 86400000) : new Date()
    const movementId = nextSnowflake()
    await query(`
      INSERT INTO wallet_movements (id, wallet_id, movement_type, amount, balance_before, balance_after,
        description, payment_date, currency, sender_name, sender_document_id, sender_account,
        sender_bank_code, reference_id, reference_type, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BOB',$9,$10,$11,$12,$13,$14,'completed',$15)
    `, [movementId, w.id, type, amount, balBefore, balAfter, opts.description || null, d,
        opts.senderName || null, opts.senderDoc || null, opts.senderAccount || null,
        opts.senderBank || null, opts.refId || null, opts.refType || null, d])
    return movementId
  }

  async function addTransfer(fromIdx: number, toIdx: number, amount: number, daysAgo = 0) {
    const fromW = W[fromIdx]; const toW = W[toIdx]
    if (!fromW || !toW) return
    const d = daysAgo ? new Date(Date.now() - daysAgo * 86400000) : new Date()
    const tId = nextSnowflake()
    const refId = `txn_${tId}`
    // From wallet movement
    const fromBal = await query('SELECT balance FROM wallets WHERE id = $1', [fromW.id])
    const fromBefore = parseFloat(fromBal.rows[0]?.balance || '0')
    await query(`
      INSERT INTO wallet_movements (id, wallet_id, movement_type, amount, balance_before, balance_after,
        description, payment_date, currency, reference_id, reference_type, status, created_at)
      VALUES ($1,$2,'transfer_out',$3,$4,$5,$6,$7,'BOB',$8,'transfer','completed',$9)
    `, [nextSnowflake(), fromW.id, amount, fromBefore, fromBefore - amount,
        `Transferencia a ${toW.name}`, d, refId, d])
    // To wallet movement
    const toBal = await query('SELECT balance FROM wallets WHERE id = $1', [toW.id])
    const toBefore = parseFloat(toBal.rows[0]?.balance || '0')
    await query(`
      INSERT INTO wallet_movements (id, wallet_id, movement_type, amount, balance_before, balance_after,
        description, payment_date, currency, reference_id, reference_type, status, created_at)
      VALUES ($1,$2,'transfer_in',$3,$4,$5,$6,$7,'BOB',$8,'transfer','completed',$9)
    `, [nextSnowflake(), toW.id, amount, toBefore, toBefore + amount,
        `Transferencia de ${fromW.name}`, d, refId, d])
    // Transfer record
    await query(`
      INSERT INTO transfers (id, sender_wallet_id, receiver_wallet_id, amount, fee, total, currency, description, status, completed_at, created_at)
      VALUES ($1,$2,$3,$4,0.00,$4,'BOB',$5,'completed',$6,$6)
    `, [nextSnowflake(), fromW.id, toW.id, amount, `Transferencia P2P`, d])
  }

  // Initial deposits to give wallets starting balance
  const initialDeposits: [number, number, string, number][] = [
    [0, 50000, 'Depósito inicial PAGUI Empresarial', 60],
    [1, 15000, 'Depósito inicial Ahorros', 60],
    [2, 100000, 'Depósito inicial Inversiones', 60],
    [3, 8000, 'Depósito inicial Cuenta Principal', 60],
    [4, 25000, 'Depósito inicial Gerencia', 60],
    [5, 75000, 'Depósito inicial IATHINGS', 60],
  ]
  for (const [wi, amt, desc, da] of initialDeposits) {
    await addMovement(wi, 'deposit', amt, { description: desc, daysAgo: da })
  }
  logger.info('Initial deposits created')

  // P2P transfers between wallets
  await addTransfer(3, 1, 500, 50)     // Demo → Ahorros
  await addTransfer(5, 4, 1200, 45)    // IATHINGS → Gerencia
  await addTransfer(0, 5, 10000, 40)   // Empresarial → IATHINGS
  await addTransfer(1, 3, 200, 35)     // Ahorros → Demo
  await addTransfer(4, 0, 3000, 30)    // Gerencia → Empresarial
  await addTransfer(3, 6, 150, 28)     // Demo → Collection (pago servicio)
  await addTransfer(5, 7, 5000, 25)    // IATHINGS → PAGUI Collection
  await addTransfer(0, 7, 2500, 20)    // Empresarial → PAGUI Collection
  await addTransfer(2, 0, 15000, 18)   // Inversiones → Empresarial
  await addTransfer(3, 1, 350, 14)     // Demo → Ahorros
  await addTransfer(4, 3, 800, 10)     // Gerencia → Demo
  await addTransfer(1, 2, 5000, 7)     // Ahorros → Inversiones
  logger.info('P2P transfers created')

  // QR payments into collection wallets (simulating merchant payments)
  const qrPayments: [number, number, string, string, number, number][] = [
    [6, 150, 'Juan Pérez', '12345678', 'Pago recibo luz', 15],
    [6, 85, 'María García', '87654321', 'Pago agua', 12],
    [6, 200, 'Carlos López', '45678912', 'Recarga', 8],
    [7, 500, 'Empresa Alpha', 'A-001', 'Pago factura', 22],
    [7, 1200, 'Empresa Beta', 'A-002', 'Servicio mensual', 18],
    [7, 350, 'Pedro Sánchez', '78912345', 'Compra QR', 5],
    [6, 75, 'Ana Torres', '32165487', 'Pago servicio', 3],
    [7, 900, 'Empresa Gamma', 'A-003', 'Mantenimiento', 1],
  ]
  for (const [wi, amt, name, doc, desc, da] of qrPayments) {
    await addMovement(wi, 'qr_payment', amt, {
      description: desc, senderName: name, senderDoc: doc,
      senderAccount: `QR-${nextSnowflake().toString().slice(-6)}`,
      senderBank: 'BANECO', daysAgo: da,
    })
  }
  logger.info('QR payments created')

  // Some fee movements
  await addMovement(0, 'fee', 5, { description: 'Comisión transferencia', daysAgo: 40 })
  await addMovement(3, 'fee', 2.50, { description: 'Comisión retiro', daysAgo: 28 })
  await addMovement(5, 'fee', 10, { description: 'Comisión transferencia', daysAgo: 25 })
  logger.info('Fee movements created')

  logger.info('Transactions seeded')

  // 11. Dependent users (users with limited access to existing tenants/wallets)
  const dependentUsers = [
    { email: 'contador@example.com', password: 'contador123', fullName: 'Contador Demo', phone: '66660001', role: Role.User },
    { email: 'asistente@example.com', password: 'asistente123', fullName: 'Asistente Demo', phone: '66660002', role: Role.User },
  ]
  const createdDependents: any[] = []
  for (const u of dependentUsers) {
    try {
      const user = await userService.create(u)
      createdDependents.push(user)
      logger.info('Dependent user created', { email: u.email })
    } catch (e: any) {
      logger.warn('Dependent user skipped', { email: u.email, error: e.message })
    }
  }

  // Link contador to IATHINGS tenant as manager, with viewer access to specific wallet
  if (createdDependents.length > 0 && storedTenants.rows[3]) {
    const iathingsTenant = storedTenants.rows[3]
    await tenantRepository.setTenant(createdDependents[0].id, iathingsTenant.id, 'manager')
    // Find IATHINGS wallet and grant viewer access
    const iathingsWallets = await query('SELECT id FROM wallets WHERE tenant_id = $1 AND deleted_at IS NULL', [iathingsTenant.id])
    for (const w of iathingsWallets.rows) {
      await walletPermissionRepository.upsert(createdDependents[0].id, w.id, 'viewer')
    }
    logger.info('Contador linked to IATHINGS tenant as manager')
  }

  // Link asistente to Demo tenant as viewer, with viewer access to primary wallet only
  if (createdDependents.length > 1 && storedTenants.rows[1]) {
    const demoTenant = storedTenants.rows[1]
    await tenantRepository.setTenant(createdDependents[1].id, demoTenant.id, 'viewer')
    const demoWallets = await query('SELECT id FROM wallets WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1', [demoTenant.id])
    for (const w of demoWallets.rows) {
      await walletPermissionRepository.upsert(createdDependents[1].id, w.id, 'viewer')
    }
    logger.info('Asistente linked to Demo tenant as viewer')
  }

  // 12. Admin related users (2 users with limited access to admin's 3 wallets)
  const adminRelatedUsers = [
    { email: 'tesorero@example.com', password: 'tesorero123', fullName: 'Tesorero Demo', phone: '66660003', role: Role.User },
    { email: 'auditor@example.com', password: 'auditor123', fullName: 'Auditor Demo', phone: '66660004', role: Role.User },
  ]
  const createdAdminRelated: any[] = []
  for (const u of adminRelatedUsers) {
    try {
      const user = await userService.create(u)
      createdAdminRelated.push(user)
      logger.info('Admin related user created', { email: u.email })
    } catch (e: any) {
      logger.warn('Admin related user skipped', { email: u.email, error: e.message })
    }
  }

  // Link tesorero to admin's tenant as manager, with manager access to first wallet and viewer to second
  if (createdAdminRelated.length > 0 && storedTenants.rows[0]) {
    const adminTenant = storedTenants.rows[0]
    await tenantRepository.setTenant(createdAdminRelated[0].id, adminTenant.id, 'manager')
    const adminWallets = await query(
      'SELECT id FROM wallets WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY id',
      [adminTenant.id]
    )
    if (adminWallets.rows.length > 0) {
      await walletPermissionRepository.upsert(createdAdminRelated[0].id, adminWallets.rows[0].id, 'manager')
    }
    if (adminWallets.rows.length > 1) {
      await walletPermissionRepository.upsert(createdAdminRelated[0].id, adminWallets.rows[1].id, 'viewer')
    }
    logger.info('Tesorero linked to admin tenant as manager')
  }

  // Link auditor to admin's tenant as viewer, with viewer access to all admin wallets
  if (createdAdminRelated.length > 1 && storedTenants.rows[0]) {
    const adminTenant = storedTenants.rows[0]
    await tenantRepository.setTenant(createdAdminRelated[1].id, adminTenant.id, 'viewer')
    const adminWallets = await query(
      'SELECT id FROM wallets WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY id',
      [adminTenant.id]
    )
    for (const w of adminWallets.rows) {
      await walletPermissionRepository.upsert(createdAdminRelated[1].id, w.id, 'viewer')
    }
    logger.info('Auditor linked to admin tenant as viewer')
  }

  logger.info('Seed completed')
}
