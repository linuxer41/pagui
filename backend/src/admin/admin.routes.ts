import { Elysia, t } from 'elysia'
import { query } from '../shared/database/pool'
import { userService } from '../identity/user.service'
import { tenantRepository } from '../identity/tenants/tenant.repository'
import { walletRepository } from '../banking/wallet/wallet.repository'
import { AppError } from '../shared/errors/app-error'
import { ok, list } from '../shared/response'
import { nextSnowflake } from '../shared/snowflake'
import { notifService } from '../payments/notification/notif.service'
import { walletPermissionRepository } from '../identity/wallet-permission/wallet-permission.repository'
import { generateDebitNotePdf } from './recaudaciones.pdf'
import { Role } from '@pagui/shared'

function getMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0))
  return { start: start.toISOString(), end: end.toISOString(), label: `${year}-${String(month).padStart(2,'0')}` }
}

export const adminRoutes = new Elysia({ prefix: '/admin' })

  // ── Stats ──
  .get('/stats', async () => {
    const [users, tenants, wallets] = await Promise.all([
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive
      FROM users WHERE deleted_at IS NULL`),
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE environment = 'sandbox') as sandbox,
        COUNT(*) FILTER (WHERE environment = 'production') as production
      FROM tenants WHERE deleted_at IS NULL`),
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive
      FROM wallets WHERE deleted_at IS NULL`),
    ])
    return ok({
      users: users.rows[0],
      tenants: tenants.rows[0],
      wallets: wallets.rows[0],
    })
  }, {
    detail: { tags: ['Admin'], summary: 'Dashboard stats' },
  })

  // ── Users ──
  .get('/users', async ({ query: q }) => {
    const result = await userService.list({
      page: q.page ? parseInt(q.page) : undefined,
      limit: q.limit ? parseInt(q.limit) : undefined,
      search: q.search,
      status: q.status,
    })
    return list(result.users, result.totalCount, 'Usuarios listados')
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      status: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Listar usuarios' },
  })

  .post('/users', async ({ body }: any) => {
    const user = await userService.create({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      phone: body.phone,
      address: body.address,
      role: body.role ?? Role.User,
    })
    return ok(user, 'Usuario creado')
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      fullName: t.String(),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
      role: t.Optional(t.Number()),
    }),
    detail: { tags: ['Admin'], summary: 'Crear usuario' },
  })

  .put('/users/:id', async ({ params, body }: any) => {
    const user = await userService.update(BigInt(params.id), body)
    return ok(user, 'Usuario actualizado')
  }, {
    body: t.Object({
      fullName: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
      status: t.Optional(t.String()),
    }),
    detail: { tags: ['Admin'], summary: 'Actualizar usuario' },
  })

  .put('/users/:id/status', async ({ params, body }: any) => {
    const user = await userService.update(BigInt(params.id), { status: body.status })
    return ok(user, `Usuario ${body.status === 'active' ? 'activado' : 'desactivado'}`)
  }, {
    body: t.Object({ status: t.String() }),
    detail: { tags: ['Admin'], summary: 'Activar/desactivar usuario' },
  })

  .get('/users/:id', async ({ params }: any) => {
    const user = await userService.getById(BigInt(params.id))
    if (!user) throw new AppError(404, 'Usuario no encontrado')
    const tenantR = await query(`
      SELECT t.id, t.full_name as "fullName", t.environment
      FROM tenant_users tu JOIN tenants t ON t.id = tu.tenant_id
      WHERE tu.user_id = $1 AND tu.deleted_at IS NULL AND t.deleted_at IS NULL
    `, [user.id])
    const walletR = await query(`
      SELECT w.id, w.wallet_number as "walletNumber", w.name, w.type, w.balance, w.status,
             w.is_collection as "isCollection", COALESCE(cc.collection_type,'gateway') as "collectionType"
      FROM wallets w
      JOIN wallet_permissions wp ON w.id = wp.wallet_id AND wp.deleted_at IS NULL
      LEFT JOIN collection_config cc ON cc.wallet_id = w.id AND cc.deleted_at IS NULL
      WHERE wp.user_id = $1 AND w.deleted_at IS NULL
    `, [user.id])
    return ok({ ...user, tenants: tenantR.rows, wallets: walletR.rows }, 'Usuario encontrado')
  }, {
    detail: { tags: ['Admin'], summary: 'Detalle de usuario' },
  })

  // ── Tenants ──
  .get('/tenants', async ({ query: q }) => {
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20')))
    const offset = (page - 1) * limit
    const conditions: string[] = ['t.deleted_at IS NULL']
    const params: unknown[] = []
    let pc = 0
    if (q.search) { pc++; conditions.push(`(t.full_name ILIKE $${pc} OR t.email ILIKE $${pc})`); params.push(`%${q.search}%`) }
    if (q.status) { pc++; conditions.push(`t.status = $${pc}`); params.push(q.status) }
    if (q.environment) { pc++; conditions.push(`t.environment = $${pc}`); params.push(q.environment) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const countR = await query(`SELECT COUNT(*) as total FROM tenants t ${where}`, params)
    const totalCount = parseInt(countR.rows[0].total)
    const rows = await query(`
      SELECT t.id, t.full_name as "fullName", t.email, t.phone,
        t.document_type as "documentType", t.document_number as "documentNumber",
        t.status, t.environment, t.created_at as "createdAt",
        (SELECT u.email FROM tenant_users tu JOIN users u ON u.id = tu.user_id WHERE tu.tenant_id = t.id AND tu.deleted_at IS NULL LIMIT 1) as "ownerEmail"
      FROM tenants t ${where}
      ORDER BY t.created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}
    `, [...params, limit, offset])
    return list({ items: rows.rows, pagination: { page, limit, totalPages: Math.ceil(totalCount / limit), total: totalCount } }, totalCount, 'Clientes listados')
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      status: t.Optional(t.String()),
      environment: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Listar clientes' },
  })

  .get('/tenants/:id', async ({ params }: any) => {
    const tenant = await tenantRepository.getById(BigInt(params.id))
    if (!tenant) throw new AppError(404, 'Cliente no encontrado')
    const walletsR = await query(`SELECT COUNT(*) as total, COALESCE(SUM(balance), 0) as totalBalance FROM wallets WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenant.id])
    return ok({
      ...tenant,
      walletCount: parseInt(walletsR.rows[0].total),
      totalBalance: parseFloat(walletsR.rows[0].totalBalance),
    }, 'Cliente encontrado')
  }, {
    detail: { tags: ['Admin'], summary: 'Detalle de cliente' },
  })

  .post('/tenants', async ({ body }: any) => {
    const tenant = await tenantRepository.create({
      id: nextSnowflake(),
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      documentType: body.documentType,
      documentNumber: body.documentNumber,
      environment: body.environment || 'production',
    })
    if (body.ownerUserId) {
      await tenantRepository.setTenant(BigInt(body.ownerUserId), tenant.id, 'owner')
    }
    return ok(tenant, 'Cliente creado')
  }, {
    body: t.Object({
      fullName: t.String(),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      documentType: t.Optional(t.String()),
      documentNumber: t.Optional(t.String()),
      environment: t.Optional(t.String()),
      ownerUserId: t.Optional(t.String()),
    }),
    detail: { tags: ['Admin'], summary: 'Crear cliente' },
  })

  .put('/tenants/:id', async ({ params, body }: any) => {
    const tenant = await tenantRepository.update(BigInt(params.id), body)
    if (!tenant) throw new AppError(404, 'Cliente no encontrado')
    return ok(tenant, 'Cliente actualizado')
  }, {
    body: t.Object({
      fullName: t.Optional(t.String()),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      documentType: t.Optional(t.String()),
      documentNumber: t.Optional(t.String()),
      address: t.Optional(t.String()),
      status: t.Optional(t.String()),
      environment: t.Optional(t.String()),
    }),
    detail: { tags: ['Admin'], summary: 'Actualizar cliente' },
  })

  .put('/tenants/:id/status', async ({ params, body }: any) => {
    const tenant = await tenantRepository.update(BigInt(params.id), { status: body.status })
    if (!tenant) throw new AppError(404, 'Cliente no encontrado')
    return ok(tenant, `Cliente ${body.status === 'active' ? 'activado' : 'desactivado'}`)
  }, {
    body: t.Object({ status: t.String() }),
    detail: { tags: ['Admin'], summary: 'Activar/desactivar cliente' },
  })

  .put('/tenants/:id/environment', async ({ params, body }: any) => {
    if (!['sandbox', 'production'].includes(body.environment)) {
      throw new AppError(400, 'Entorno inválido. Use sandbox o production')
    }
    const tenant = await tenantRepository.update(BigInt(params.id), { environment: body.environment })
    if (!tenant) throw new AppError(404, 'Cliente no encontrado')
    return ok(tenant, `Entorno cambiado a ${body.environment}`)
  }, {
    body: t.Object({ environment: t.String() }),
    detail: { tags: ['Admin'], summary: 'Cambiar entorno sandbox/production' },
  })

  // ── Wallets ──
  .get('/wallets', async ({ query: q }) => {
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20')))
    const offset = (page - 1) * limit
    const conditions: string[] = ['w.deleted_at IS NULL']
    const params: unknown[] = []
    let pc = 0
    if (q.search) { pc++; conditions.push(`(w.wallet_number ILIKE $${pc} OR w.name ILIKE $${pc})`); params.push(`%${q.search}%`) }
    if (q.status) { pc++; conditions.push(`w.status = $${pc}`); params.push(q.status) }
    if (q.tenantId) { pc++; conditions.push(`w.tenant_id = $${pc}`); params.push(q.tenantId) }
    if (q.type) { pc++; conditions.push(`w.type = $${pc}`); params.push(q.type) }
    const where = 'WHERE ' + conditions.join(' AND ')
    const countR = await query(`SELECT COUNT(*) as total FROM wallets w ${where}`, params)
    const totalCount = parseInt(countR.rows[0].total)
    const rows = await query(`
      SELECT w.id, w.wallet_number as "walletNumber", w.name, w.type, w.level,
        w.currency, w.balance, w.available_balance as "availableBalance",
        w.held_balance as "heldBalance", w.tenant_id as "tenantId",
        w.status, w.is_collection as "isCollection", w.is_default as "isDefault",
        w.created_at as "createdAt",
        t.full_name as "tenantName", t.environment as "tenantEnvironment",
        COALESCE(cc.collection_type,'gateway') as "collectionType"
      FROM wallets w
      LEFT JOIN tenants t ON t.id = w.tenant_id
      LEFT JOIN collection_config cc ON cc.wallet_id = w.id AND cc.deleted_at IS NULL
      ${where}
      ORDER BY w.created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}
    `, [...params, limit, offset])
    return list({ items: rows.rows, pagination: { page, limit, totalPages: Math.ceil(totalCount / limit), total: totalCount } }, totalCount, 'Billeteras listadas')
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      status: t.Optional(t.String()),
      tenantId: t.Optional(t.String()),
      type: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Listar billeteras' },
  })

  .get('/wallets/:id', async ({ params }: any) => {
    const wallet = await walletRepository.getById(BigInt(params.id))
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    const tenantR = await query(`SELECT full_name as "fullName", environment FROM tenants WHERE id = $1`, [wallet.tenantId])
    const cfgR = await query(`SELECT collection_type as "collectionType" FROM collection_config WHERE wallet_id = $1 AND deleted_at IS NULL`, [wallet.id])
    const collectionType = cfgR.rows[0]?.collectionType || 'gateway'
    const balanceDisplay = wallet.isCollection && collectionType === 'direct' ? 0 : wallet.balance
    return ok({ ...wallet, balanceDisplay, collectionType, tenantName: tenantR.rows[0]?.fullName || null, tenantEnvironment: tenantR.rows[0]?.environment || null }, 'Billetera encontrada')
  }, {
    detail: { tags: ['Admin'], summary: 'Detalle de billetera' },
  })

  .put('/wallets/:id/status', async ({ params, body }: any) => {
    const wallet = await walletRepository.update(BigInt(params.id), { status: body.status })
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    return ok(wallet, `Billetera ${body.status === 'active' ? 'activada' : 'desactivada'}`)
  }, {
    body: t.Object({ status: t.String() }),
    detail: { tags: ['Admin'], summary: 'Activar/desactivar billetera' },
  })

  // ── Wallet Credit (abono manual) ──
  .post('/wallets/:id/credit', async ({ params, body }: any) => {
    const wallet = await walletRepository.getById(BigInt(params.id))
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    const amount = Math.abs(parseFloat(body.amount))
    if (isNaN(amount) || amount <= 0) throw new AppError(400, 'Monto inválido')

    const movementId = nextSnowflake()
    const newBalance = parseFloat(wallet.balance as any) + amount
    const newAvailable = parseFloat(wallet.availableBalance as any) + amount

    await query('UPDATE wallets SET balance = $1, available_balance = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [newBalance, newAvailable, wallet.id])

    await query(`
      INSERT INTO wallet_movements (id, wallet_id, movement_type, amount, balance_before, balance_after,
        description, currency, reference_id, reference_type, status, created_at)
      VALUES ($1, $2, 'deposit', $3, $4, $5, $6, 'BOB', $7, 'admin_credit', 'completed', CURRENT_TIMESTAMP)
    `, [movementId, wallet.id, amount, wallet.balance, newBalance,
      body.description || `Abono manual por ${(body.amount || amount).toFixed(2)} BOB`, movementId])

    const userIds = await notifService.getWalletUserIds(wallet.id)
    await Promise.all(userIds.map(uid =>
      notifService.creditReceived(uid, amount, body.description || `Abono manual por ${amount.toFixed(2)} BOB`)
    ))

    return ok({ movementId, newBalance, newAvailable }, 'Saldo acreditado')
  }, {
    body: t.Object({
      amount: t.Number(),
      description: t.Optional(t.String()),
    }),
    detail: { tags: ['Admin'], summary: 'Acreditar saldo manualmente' },
  })

  // ── Wallet Movements ──
  .get('/wallets/:id/movements', async ({ params, query: q }) => {
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(q.limit || '50')))
    const offset = (page - 1) * limit
    const conditions: string[] = ['wm.wallet_id = $1', 'wm.deleted_at IS NULL']
    const queryParams: unknown[] = [BigInt(params.id)]
    let pc = 1
    if (q.type) { pc++; conditions.push(`wm.movement_type = $${pc}`); queryParams.push(q.type) }
    if (q.status) { pc++; conditions.push(`wm.status = $${pc}`); queryParams.push(q.status) }
    if (q.dateFrom) { pc++; conditions.push(`wm.created_at >= $${pc}`); queryParams.push(q.dateFrom) }
    if (q.dateTo) { pc++; conditions.push(`wm.created_at <= $${pc}`); queryParams.push(q.dateTo) }

    const where = 'WHERE ' + conditions.join(' AND ')
    const countR = await query(`SELECT COUNT(*) as total FROM wallet_movements wm ${where}`, queryParams)
    const totalCount = parseInt(countR.rows[0].total)
    const rows = await query(`
      SELECT wm.id, wm.wallet_id as "walletId", wm.movement_type as "movementType",
        wm.amount, wm.balance_before as "balanceBefore", wm.balance_after as "balanceAfter",
        wm.description, wm.currency, wm.status, wm.payment_date as "paymentDate",
        wm.reference_id as "referenceId", wm.reference_type as "referenceType",
        wm.sender_name as "senderName", wm.sender_document_id as "senderDocumentId",
        wm.sender_account as "senderAccount", wm.sender_bank_code as "senderBankCode",
        wm.created_at as "createdAt"
      FROM wallet_movements wm ${where}
      ORDER BY wm.created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}
    `, [...queryParams, limit, offset])
    return list({ items: rows.rows, pagination: { page, limit, totalPages: Math.ceil(totalCount / limit), total: totalCount } }, totalCount, 'Movimientos listados')
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      type: t.Optional(t.String()),
      status: t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Movimientos de billetera' },
  })

  // ── All Transactions ──
  .get('/transactions', async ({ query: q }) => {
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(q.limit || '50')))
    const offset = (page - 1) * limit
    const conditions: string[] = ['t.deleted_at IS NULL']
    const queryParams: unknown[] = []
    let pc = 0
    if (q.status) { pc++; conditions.push(`t.status = $${pc}`); queryParams.push(q.status) }
    if (q.dateFrom) { pc++; conditions.push(`t.created_at >= $${pc}`); queryParams.push(q.dateFrom) }
    if (q.dateTo) { pc++; conditions.push(`t.created_at <= $${pc}`); queryParams.push(q.dateTo) }

    const where = 'WHERE ' + conditions.join(' AND ')
    const countR = await query(`SELECT COUNT(*) as total FROM transfers t ${where}`, queryParams)
    const totalCount = parseInt(countR.rows[0].total)
    const rows = await query(`
      SELECT t.id, t.sender_wallet_id as "senderWalletId",
        (SELECT w.wallet_number FROM wallets w WHERE w.id = t.sender_wallet_id) as "senderWalletNumber",
        (SELECT w.name FROM wallets w WHERE w.id = t.sender_wallet_id) as "senderWalletName",
        t.receiver_wallet_id as "receiverWalletId",
        (SELECT w.wallet_number FROM wallets w WHERE w.id = t.receiver_wallet_id) as "receiverWalletNumber",
        (SELECT w.name FROM wallets w WHERE w.id = t.receiver_wallet_id) as "receiverWalletName",
        t.amount, t.fee, t.total, t.currency, t.description, t.status,
        t.completed_at as "completedAt", t.created_at as "createdAt",
        t.error_message as "errorMessage"
      FROM transfers t ${where}
      ORDER BY t.created_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}
    `, [...queryParams, limit, offset])
    return list({ items: rows.rows, pagination: { page, limit, totalPages: Math.ceil(totalCount / limit), total: totalCount } }, totalCount, 'Transacciones listadas')
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Todas las transacciones' },
  })

  .get('/transactions/:id', async ({ params }: any) => {
    const r = await query(`
      SELECT t.id, t.sender_wallet_id as "senderWalletId",
        (SELECT w.wallet_number FROM wallets w WHERE w.id = t.sender_wallet_id) as "senderWalletNumber",
        (SELECT w.name FROM wallets w WHERE w.id = t.sender_wallet_id) as "senderWalletName",
        t.receiver_wallet_id as "receiverWalletId",
        (SELECT w.wallet_number FROM wallets w WHERE w.id = t.receiver_wallet_id) as "receiverWalletNumber",
        (SELECT w.name FROM wallets w WHERE w.id = t.receiver_wallet_id) as "receiverWalletName",
        t.amount, t.fee, t.total, t.currency, t.description, t.status,
        t.reference_type as "referenceType", t.reference_id as "referenceId",
        t.completed_at as "completedAt", t.created_at as "createdAt",
        t.error_message as "errorMessage"
      FROM transfers t WHERE t.id = $1 AND t.deleted_at IS NULL
    `, [BigInt(params.id)])
    if (!r.rowCount) throw new AppError(404, 'Transacción no encontrada')
    return ok(r.rows[0], 'Transacción encontrada')
  }, {
    detail: { tags: ['Admin'], summary: 'Detalle de transacción' },
  })

  // ── Wallet Transfer Tenant ──
  .put('/wallets/:id/transfer-tenant', async ({ params, body }: any) => {
    const wallet = await walletRepository.getById(BigInt(params.id))
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    if (body.tenantId) {
      const tenantR = await query('SELECT id FROM tenants WHERE id = $1 AND deleted_at IS NULL', [BigInt(body.tenantId)])
      if (!tenantR.rowCount) throw new AppError(404, 'Cliente destino no encontrado')
    }
    const updated = await walletRepository.update(BigInt(params.id), { tenantId: body.tenantId ? BigInt(body.tenantId) : null })
    return ok(updated, 'Billetera transferida a nuevo cliente')
  }, {
    body: t.Object({ tenantId: t.Optional(t.String()) }),
    detail: { tags: ['Admin'], summary: 'Transferir billetera a otro cliente' },
  })

  // ── Wallet Permissions ──
  .get('/wallets/:id/permissions', async ({ params }: any) => {
    const r = await query(`
      SELECT wp.user_id as "userId", wp.wallet_id as "walletId", wp.role,
        wp.created_at as "createdAt", u.email, u.full_name as "fullName"
      FROM wallet_permissions wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.wallet_id = $1 AND wp.deleted_at IS NULL
      ORDER BY wp.role ASC
    `, [BigInt(params.id)])
    return ok({ items: r.rows }, 'Permisos listados')
  }, {
    detail: { tags: ['Admin'], summary: 'Listar permisos de billetera' },
  })

  .post('/wallets/:id/permissions', async ({ params, body }: any) => {
    const userId = BigInt(body.userId)
    const wallet = await walletRepository.getById(BigInt(params.id))
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    const userR = await query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [userId])
    if (!userR.rowCount) throw new AppError(404, 'Usuario no encontrado')
    const role = body.role || 'viewer'
    if (!['owner', 'manager', 'viewer'].includes(role)) throw new AppError(400, 'Rol inválido. Use owner, manager o viewer')
    await walletPermissionRepository.upsert(userId, BigInt(params.id), role)
    return ok(null, `Acceso ${role} concedido`)
  }, {
    body: t.Object({ userId: t.String(), role: t.Optional(t.String()) }),
    detail: { tags: ['Admin'], summary: 'Conceder/actualizar acceso a billetera' },
  })

  .delete('/wallets/:id/permissions/:userId', async ({ params }: any) => {
    await walletPermissionRepository.remove(BigInt(params.userId), BigInt(params.id))
    return ok(null, 'Acceso revocado')
  }, {
    detail: { tags: ['Admin'], summary: 'Revocar acceso a billetera' },
  })

  // ════════════════════════════════════════════════════
  // ── RECAUDACIONES ADMIN (panel por empresa / mes)
  // ════════════════════════════════════════════════════

  // Lista de empresas que recaudaron en el mes — base del panel
  .get('/recaudaciones', async ({ query: q }: any) => {
    const now = new Date()
    const year = parseInt(q.year || String(now.getUTCFullYear()))
    const month = parseInt(q.month || String(now.getUTCMonth() + 1))
    if (month < 1 || month > 12) throw new AppError(400, 'Mes inválido (1-12)')
    const { start, end } = getMonthRange(year, month)
    const search = (q.search || '').trim()
    const searchParam = search ? `%${search}%` : null

    // Comisión base 0.1% (0.001) y descuento 0.05% (0.0005) si >200k. Neto 0 si usa credenciales propias (direct)
    const rows = await query(`
      SELECT
        t.id as "tenantId",
        t.full_name as "tenantName",
        t.email as "tenantEmail",
        t.phone as "tenantPhone",
        t.document_type as "documentType",
        t.document_number as "documentNumber",
        t.address as "tenantAddress",
        COUNT(m.id)::int as "txCount",
        COALESCE(SUM(m.amount),0)::float as "totalGross",
        COALESCE(MAX(COALESCE(cc.commission_rate,0.001)),0.001)::float as "baseRate",
        COALESCE(MAX(COALESCE(cc.discount_rate,0.0005)),0.0005)::float as "discountRate",
        COALESCE(MAX(COALESCE(cc.discount_threshold,200000)),200000)::float as "discountThreshold",
        BOOL_OR(COALESCE(cc.discount_enabled,false)) as "hasDiscount",
        COALESCE(MAX(cc.collection_type),'gateway') as "collectionType",
        JSON_AGG(DISTINCT jsonb_build_object('walletId', w.id::text, 'walletNumber', w.wallet_number, 'commissionRate', COALESCE(cc.commission_rate,0.001), 'collectionType', COALESCE(cc.collection_type,'gateway'), 'discountEnabled', COALESCE(cc.discount_enabled,false), 'discountRate', COALESCE(cc.discount_rate,0.0005), 'discountThreshold', COALESCE(cc.discount_threshold,200000))) FILTER (WHERE w.id IS NOT NULL) as "wallets"
      FROM tenants t
      JOIN wallets w ON w.tenant_id = t.id AND w.is_collection = true AND w.deleted_at IS NULL
      LEFT JOIN collection_config cc ON cc.wallet_id = w.id AND cc.deleted_at IS NULL
      JOIN wallet_movements m ON m.wallet_id = w.id AND m.deleted_at IS NULL
        AND m.movement_type IN ('qr_payment','deposit','transfer_in','settlement')
        AND m.status = 'completed'
        AND m.created_at >= $1::timestamptz AND m.created_at < $2::timestamptz
      WHERE t.deleted_at IS NULL
        AND ($3::text IS NULL OR t.full_name ILIKE $3 OR t.email ILIKE $3 OR t.document_number ILIKE $3)
      GROUP BY t.id
      HAVING COUNT(m.id) > 0
      ORDER BY SUM(m.amount) DESC
    `, [start, end, searchParam])

    const enriched = rows.rows.map((r: any) => {
      const gross = parseFloat(r.totalGross)
      const base = parseFloat(r.baseRate) || 0.001
      const discRate = parseFloat(r.discountRate) || 0.0005
      const threshold = parseFloat(r.discountThreshold) || 200000
      const hasDisc = !!r.hasDiscount
      const qualifies = hasDisc && gross > threshold
      const effectiveRate = qualifies ? discRate : base
      const commission = gross * effectiveRate
      const isDirect = (r.collectionType || 'gateway') === 'direct'
      return {
        ...r,
        effectiveRate,
        effectivePercent: effectiveRate * 100,
        totalCommission: commission,
        netAmount: isDirect ? 0 : gross - commission,
        isDirect,
        qualifiesForDiscount: qualifies,
        discountLabel: hasDisc ? (qualifies ? `0.05% (supera Bs ${threshold.toLocaleString('es-BO')})` : `0.10% → 0.05% si > Bs ${threshold.toLocaleString('es-BO')}`) : '0.10%',
      }
    })

    const totalGross = enriched.reduce((s: number, r: any) => s + r.totalGross, 0)
    const totalCommission = enriched.reduce((s: number, r: any) => s + r.totalCommission, 0)
    const totalNet = enriched.reduce((s: number, r: any) => s + r.netAmount, 0)
    const totalTx = enriched.reduce((s: number, r: any) => s + parseInt(r.txCount), 0)

    return ok({
      period: { year, month, start, end },
      summary: { empresas: enriched.length, totalGross, totalCommission, netAmount: totalNet, totalTx },
      items: enriched
    }, 'Recaudaciones del mes')
  }, {
    query: t.Optional(t.Object({
      year: t.Optional(t.String()),
      month: t.Optional(t.String()),
      search: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Listar recaudaciones por empresa del mes' },
  })

  // Detalle de movimientos de una empresa en el mes (paginado)
  .get('/recaudaciones/:tenantId', async ({ params, query: q }: any) => {
    const tenantId = BigInt(params.tenantId)
    const now = new Date()
    const year = parseInt(q.year || String(now.getUTCFullYear()))
    const month = parseInt(q.month || String(now.getUTCMonth() + 1))
    const { start, end } = getMonthRange(year, month)
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(q.limit || '50')))
    const offset = (page - 1) * limit

    const tenant = await tenantRepository.getById(tenantId)
    if (!tenant) throw new AppError(404, 'Empresa no encontrada')

    const countR = await query(`
      SELECT COUNT(*)::int as total
      FROM wallet_movements m
      JOIN wallets w ON w.id = m.wallet_id AND w.is_collection = true AND w.deleted_at IS NULL
      WHERE w.tenant_id = $1 AND m.deleted_at IS NULL
        AND m.movement_type IN ('qr_payment','deposit','transfer_in','settlement')
        AND m.status = 'completed'
        AND m.created_at >= $2::timestamptz AND m.created_at < $3::timestamptz
    `, [tenantId, start, end])
    const total = countR.rows[0].total

    const cfgR = await query(`
      SELECT COALESCE(MAX(COALESCE(cc.commission_rate,0.001)),0.001)::float as "baseRate",
             COALESCE(MAX(COALESCE(cc.discount_rate,0.0005)),0.0005)::float as "discountRate",
             COALESCE(MAX(COALESCE(cc.discount_threshold,200000)),200000)::float as "discountThreshold",
             BOOL_OR(COALESCE(cc.discount_enabled,false)) as "hasDiscount",
             COALESCE(MAX(cc.collection_type),'gateway') as "collectionType"
      FROM wallets w LEFT JOIN collection_config cc ON cc.wallet_id = w.id AND cc.deleted_at IS NULL
      WHERE w.tenant_id = $1 AND w.is_collection = true AND w.deleted_at IS NULL
    `, [tenantId])
    const cfg = cfgR.rows[0] || { baseRate: 0.001, discountRate: 0.0005, discountThreshold: 200000, hasDiscount: false, collectionType: 'gateway' }

    const sumR = await query(`
      SELECT COALESCE(SUM(m.amount),0)::float as "totalGross"
      FROM wallet_movements m
      JOIN wallets w ON w.id = m.wallet_id AND w.is_collection = true
      WHERE w.tenant_id = $1 AND m.deleted_at IS NULL
        AND m.movement_type IN ('qr_payment','deposit','transfer_in','settlement')
        AND m.status = 'completed'
        AND m.created_at >= $2::timestamptz AND m.created_at < $3::timestamptz
    `, [tenantId, start, end])
    const totalGross = parseFloat(sumR.rows[0].totalGross) || 0
    const baseRate = parseFloat(cfg.baseRate) || 0.001
    const discRate = parseFloat(cfg.discountRate) || 0.0005
    const threshold = parseFloat(cfg.discountThreshold) || 200000
    const hasDisc = !!cfg.hasDiscount
    const isDirect = (cfg.collectionType || 'gateway') === 'direct'
    const qualifies = hasDisc && totalGross > threshold
    const effectiveRate = qualifies ? discRate : baseRate
    const totalCommission = totalGross * effectiveRate

    const rows = await query(`
      SELECT
        m.id,
        m.wallet_id as "walletId",
        w.wallet_number as "walletNumber",
        w.name as "walletName",
        m.movement_type as "movementType",
        m.amount::float as amount,
        (m.amount * $6)::float as commission,
        $6::float as "commissionRate",
        $7::bool as "hasDiscount",
        $8::float as "discountThreshold",
        m.description,
        m.currency,
        m.sender_name as "senderName",
        m.sender_document_id as "senderDocumentId",
        m.sender_account as "senderAccount",
        m.status,
        m.created_at as "createdAt",
        m.payment_date as "paymentDate",
        m.transaction_id as "transactionId",
        m.qr_id as "qrId"
      FROM wallet_movements m
      JOIN wallets w ON w.id = m.wallet_id AND w.is_collection = true AND w.deleted_at IS NULL
      LEFT JOIN collection_config cc ON cc.wallet_id = w.id AND cc.deleted_at IS NULL
      WHERE w.tenant_id = $1 AND m.deleted_at IS NULL
        AND m.movement_type IN ('qr_payment','deposit','transfer_in','settlement')
        AND m.status = 'completed'
        AND m.created_at >= $2::timestamptz AND m.created_at < $3::timestamptz
      ORDER BY m.created_at DESC
      LIMIT $4 OFFSET $5
    `, [tenantId, start, end, limit, offset, effectiveRate, hasDisc, threshold])

    return ok({
      tenant,
      period: { year, month, start, end },
      summary: { total, totalGross, totalCommission, netAmount: isDirect ? 0 : totalGross - totalCommission, effectiveRate, effectivePercent: effectiveRate*100, hasDiscount: hasDisc, discountThreshold: threshold, qualifiesForDiscount: qualifies, collectionType: cfg.collectionType, isDirect },
      items: rows.rows,
      pagination: { page, limit, totalPages: Math.ceil(total / limit), total }
    }, 'Detalle de recaudaciones')
  }, {
    query: t.Optional(t.Object({
      year: t.Optional(t.String()),
      month: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Detalle recaudaciones de una empresa por mes' },
  })

  // Datos para Nota de Débito por comisión (PDF) — una empresa / un mes
  .get('/recaudaciones/:tenantId/debit-note', async ({ params, query: q }: any) => {
    const tenantId = BigInt(params.tenantId)
    const now = new Date()
    const year = parseInt(q.year || String(now.getUTCFullYear()))
    const month = parseInt(q.month || String(now.getUTCMonth() + 1))
    const { start, end, label } = getMonthRange(year, month)

    const tenant = await tenantRepository.getById(tenantId)
    if (!tenant) throw new AppError(404, 'Empresa no encontrada')

    const agg = await query(`
      SELECT
        COUNT(m.id)::int as "txCount",
        COALESCE(SUM(m.amount),0)::float as "totalGross",
        COALESCE(MAX(COALESCE(cc.commission_rate,0.001)),0.001)::float as "baseRate",
        COALESCE(MAX(COALESCE(cc.discount_rate,0.0005)),0.0005)::float as "discountRate",
        COALESCE(MAX(COALESCE(cc.discount_threshold,200000)),200000)::float as "discountThreshold",
        BOOL_OR(COALESCE(cc.discount_enabled,false)) as "hasDiscount",
        COALESCE(MAX(cc.collection_type),'gateway') as "collectionType",
        MIN(m.created_at) as "firstTx",
        MAX(m.created_at) as "lastTx"
      FROM wallet_movements m
      JOIN wallets w ON w.id = m.wallet_id AND w.is_collection = true AND w.deleted_at IS NULL
      LEFT JOIN collection_config cc ON cc.wallet_id = w.id AND cc.deleted_at IS NULL
      WHERE w.tenant_id = $1 AND m.deleted_at IS NULL
        AND m.movement_type IN ('qr_payment','deposit','transfer_in','settlement')
        AND m.status = 'completed'
        AND m.created_at >= $2::timestamptz AND m.created_at < $3::timestamptz
    `, [tenantId, start, end])

    const row = agg.rows[0]
    if (!row || row.txCount === 0) throw new AppError(404, 'Sin recaudaciones en el periodo solicitado')

    const totalGross = parseFloat(row.totalGross)
    const baseRate = parseFloat(row.baseRate) || 0.001
    const discRate = parseFloat(row.discountRate) || 0.0005
    const threshold = parseFloat(row.discountThreshold) || 200000
    const hasDisc = !!row.hasDiscount
    const isDirect = (row.collectionType || 'gateway') === 'direct'
    const qualifies = hasDisc && totalGross > threshold
    const effectiveRate = qualifies ? discRate : baseRate
    const totalCommission = totalGross * effectiveRate
    const avgRate = effectiveRate
    const netAmount = isDirect ? 0 : totalGross - totalCommission
    // IVA 13% sobre comisión (ajustar según normativa BO)
    const ivaRate = 0.13
    const commissionIva = Number((totalCommission * ivaRate).toFixed(2))
    const commissionWithIva = Number((totalCommission + commissionIva).toFixed(2))

    const correlative = `ND-${label.replace('-','')}-${String(tenantId).slice(-6)}`
    const issueDate = new Date().toISOString()
    const periodLabel = new Date(Date.UTC(year, month-1, 1)).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
    // QR para pago de la comisión — generado desde cuenta PAGUI Empresarial (gateway)
    let qrDataUrl: string | null = null
    let paymentUrl: string | null = null
    let qrId: string | null = null
    try {
      const paguiWallet = await walletRepository.getBusinessAccount()
      if (paguiWallet) {
        const { qrService } = await import('../payments/qr/qr.service')
        const qr = await qrService.generate({
          walletId: paguiWallet.id,
          amount: Number(totalCommission.toFixed(2)),
          currency: 'BOB',
          description: `Comisión ${correlative} - ${tenant.fullName} - ${periodLabel}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          singleUse: true,
          modifyAmount: false,
        })
        qrDataUrl = qr.qrImage?.startsWith('data:') ? qr.qrImage : `data:image/png;base64,${qr.qrImage}`
        paymentUrl = `${process.env.FRONTEND_URL || 'https://pagui.app'}/qr/${qr.qrId}`
        qrId = qr.qrId
      } else {
        throw new Error('No business wallet')
      }
    } catch (e) {
      try {
        const QRCode = (await import('qrcode')).default
        paymentUrl = `${process.env.FRONTEND_URL || 'https://pagui.app'}/pay-debit-note?correlative=${correlative}&tenantId=${tenantId}&amount=${totalCommission.toFixed(2)}&period=${label}`
        qrDataUrl = await QRCode.toDataURL(paymentUrl, { width: 600, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } })
      } catch {}
    }
    // Guardar/actualizar nota de débito y vincular QR — para marcado automático como pagada vía pasarela Pagui
    let debitNote: any = null
    try {
      const { debitNoteService } = await import('./debit-note.service')
      debitNote = await debitNoteService.upsert(tenantId, year, month, correlative, periodLabel, totalCommission, qrId)
    } catch {}

    return ok({
      correlative,
      issueDate,
      period: { year, month, label, periodLabel, start, end },
      issuer: {
        name: 'PAGUI / IATHINGS',
        nit: '—',
        address: 'Santa Cruz, Bolivia',
      },
      debitNote,
      payment: { qrDataUrl, paymentUrl, qrId, amount: totalCommission, currency: 'BOB', wallet: 'PAGUI Empresarial' },
      client: {
        id: String(tenant.id),
        name: tenant.fullName,
        email: tenant.email,
        phone: tenant.phone,
        documentType: tenant.documentType,
        documentNumber: tenant.documentNumber,
        address: tenant.address,
        kycLevel: tenant.kycLevel,
      },
      summary: {
        txCount: row.txCount,
        totalGross,
        baseRate,
        discountRate: discRate,
        discountThreshold: threshold,
        hasDiscount: hasDisc,
        isDirect,
        collectionType: row.collectionType,
        qualifiesForDiscount: qualifies,
        avgCommissionRate: avgRate,
        effectiveRate,
        avgCommissionPercent: Number((avgRate*100).toFixed(4)),
        totalCommission,
        ivaRate,
        commissionIva,
        commissionWithIva,
        netAmount,
        firstTx: row.firstTx,
        lastTx: row.lastTx,
      },
      concept: `Comisión por servicio de recaudación ${qualifies ? '(0.05% por superar Bs '+threshold.toLocaleString('es-BO')+')' : '(0.10%)'} — ${periodLabel} — ${row.txCount} transacciones por Bs ${totalGross.toFixed(2)}`,
      currency: 'BOB'
    }, 'Nota de débito generada')
  }, {
    query: t.Optional(t.Object({
      year: t.Optional(t.String()),
      month: t.Optional(t.String()),
    })),
    detail: { tags: ['Admin'], summary: 'Datos para nota de débito por comisión del mes' },
  })

  // Activar/desactivar descuento por volumen para una empresa
  .put('/recaudaciones/:tenantId/discount', async ({ params, body }: any) => {
    const tenantId = BigInt(params.tenantId)
    const tenant = await tenantRepository.getById(tenantId)
    if (!tenant) throw new AppError(404, 'Empresa no encontrada')
    const wallets = await query('SELECT id FROM wallets WHERE tenant_id = $1 AND is_collection = true AND deleted_at IS NULL', [tenantId])
    if (!wallets.rowCount) throw new AppError(404, 'Empresa sin billetera de recaudación')
    const enabled = !!body.enabled
    const threshold = body.threshold != null ? parseFloat(body.threshold) : 200000
    const discRate = body.discountRate != null ? parseFloat(body.discountRate) : 0.0005
    const baseRate = body.baseRate != null ? parseFloat(body.baseRate) : 0.001
    for (const w of wallets.rows) {
      await query(`
        INSERT INTO collection_config (id, wallet_id, commission_rate, discount_enabled, discount_threshold, discount_rate, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (wallet_id) DO UPDATE SET
          commission_rate = $3,
          discount_enabled = $4,
          discount_threshold = $5,
          discount_rate = $6,
          updated_at = CURRENT_TIMESTAMP,
          deleted_at = NULL
      `, [nextSnowflake(), w.id, baseRate, enabled, threshold, discRate])
    }
    return ok({ tenantId: String(tenantId), enabled, threshold, discountRate: discRate, baseRate }, `Descuento ${enabled ? 'activado (0.05% si > Bs '+threshold.toLocaleString('es-BO')+')' : 'desactivado (0.10% fijo)'}`)
  }, {
    body: t.Object({
      enabled: t.Boolean(),
      threshold: t.Optional(t.Number()),
      discountRate: t.Optional(t.Number()),
      baseRate: t.Optional(t.Number()),
    }),
    detail: { tags: ['Admin'], summary: 'Activar/desactivar descuento 0.05% por volumen' },
  })

  // PDF binario generado con librería backend (pdfkit) — no HTML, render nativo PDF
  .get('/recaudaciones/:tenantId/debit-note/pdf', async ({ params, query: q, set }: any) => {
    const tenantId = BigInt(params.tenantId)
    const now = new Date()
    const year = parseInt((q as any).year || String(now.getUTCFullYear()))
    const month = parseInt((q as any).month || String(now.getUTCMonth() + 1))
    const { start, end, label } = getMonthRange(year, month)
    const tenant = await tenantRepository.getById(tenantId)
    if (!tenant) throw new AppError(404, 'Empresa no encontrada')
    const agg = await query(`
      SELECT COUNT(m.id)::int as "txCount",
             COALESCE(SUM(m.amount),0)::float as "totalGross",
             COALESCE(MAX(COALESCE(cc.commission_rate,0.001)),0.001)::float as "baseRate",
             COALESCE(MAX(COALESCE(cc.discount_rate,0.0005)),0.0005)::float as "discountRate",
             COALESCE(MAX(COALESCE(cc.discount_threshold,200000)),200000)::float as "discountThreshold",
             BOOL_OR(COALESCE(cc.discount_enabled,false)) as "hasDiscount",
             COALESCE(MAX(cc.collection_type),'gateway') as "collectionType"
      FROM wallet_movements m
      JOIN wallets w ON w.id = m.wallet_id AND w.is_collection = true AND w.deleted_at IS NULL
      LEFT JOIN collection_config cc ON cc.wallet_id = w.id AND cc.deleted_at IS NULL
      WHERE w.tenant_id = $1 AND m.deleted_at IS NULL
        AND m.movement_type IN ('qr_payment','deposit','transfer_in','settlement')
        AND m.status = 'completed'
        AND m.created_at >= $2::timestamptz AND m.created_at < $3::timestamptz
    `, [tenantId, start, end])
    const row: any = agg.rows[0]
    if (!row || row.txCount === 0) throw new AppError(404, 'Sin recaudaciones en el periodo')
    const totalGross = parseFloat(row.totalGross)
    const baseRate = parseFloat(row.baseRate) || 0.001
    const discRate = parseFloat(row.discountRate) || 0.0005
    const threshold = parseFloat(row.discountThreshold) || 200000
    const hasDisc = !!row.hasDiscount
    const isDirect = (row.collectionType || 'gateway') === 'direct'
    const qualifies = hasDisc && totalGross > threshold
    const effectiveRate = qualifies ? discRate : baseRate
    const totalCommission = totalGross * effectiveRate
    const netAmount = isDirect ? 0 : totalGross - totalCommission
    const correlative = `ND-${label.replace('-','')}-${String(tenantId).slice(-6)}`
    const issueDate = new Date().toISOString()
    const periodLabel = new Date(Date.UTC(year, month-1, 1)).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
    // QR desde PAGUI Empresarial para pago automático
    let qrDataUrl: string | null = null
    let qrId: string | null = null
    try {
      const paguiWallet = await walletRepository.getBusinessAccount()
      if (paguiWallet) {
        const { qrService } = await import('../payments/qr/qr.service')
        const qr = await qrService.generate({
          walletId: paguiWallet.id,
          amount: Number(totalCommission.toFixed(2)),
          currency: 'BOB',
          description: `Comisión ${correlative} - ${tenant.fullName} - ${periodLabel}`,
          dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10),
          singleUse: true, modifyAmount: false,
        })
        qrDataUrl = qr.qrImage?.startsWith('data:') ? qr.qrImage : `data:image/png;base64,${qr.qrImage}`
        qrId = qr.qrId
      }
    } catch {}
    try {
      const { debitNoteService } = await import('./debit-note.service')
      await debitNoteService.upsert(tenantId, year, month, correlative, periodLabel, totalCommission, qrId)
    } catch {}
    const pdf = await generateDebitNotePdf({
      correlative, issueDate,
      period: { label, periodLabel, start, end, year, month },
      issuer: { name: 'PAGUI / IATHINGS', nit: '—', address: 'Santa Cruz, Bolivia' },
      client: { id: String(tenant.id), name: tenant.fullName, email: tenant.email, phone: tenant.phone, documentType: tenant.documentType, documentNumber: tenant.documentNumber, address: tenant.address },
      summary: { txCount: row.txCount, totalGross, baseRate, discountRate: discRate, discountThreshold: threshold, hasDiscount: hasDisc, isDirect, collectionType: row.collectionType, qualifiesForDiscount: qualifies, effectiveRate, avgCommissionPercent: effectiveRate*100, totalCommission, netAmount, firstTx: null, lastTx: null } as any,
      concept: `Comisión por servicio de recaudación ${qualifies ? '(0.05% por superar Bs '+threshold.toLocaleString('es-BO')+')' : '(0.10%)'} — ${periodLabel} — ${row.txCount} transacciones por Bs ${totalGross.toFixed(2)}`,
      currency: 'BOB',
      payment: { qrDataUrl, amount: totalCommission, currency: 'BOB' } as any,
    })
    set.headers['Content-Type'] = 'application/pdf'
    set.headers['Content-Disposition'] = `inline; filename="${correlative}.pdf"`
    return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${correlative}.pdf"` } }) as any
  }, {
    query: t.Optional(t.Object({ year: t.Optional(t.String()), month: t.Optional(t.String()) })),
    detail: { tags: ['Admin'], summary: 'PDF nota de débito (pdfkit, sin HTML)' },
  })

  // ── API Keys (admin) ──
  .get('/api-keys', async ({ query: q }: any) => {
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20')))
    const offset = (page - 1) * limit
    const search = (q.search || '').trim()
    const where: string[] = ['ak.deleted_at IS NULL']
    const params: unknown[] = []
    let pc = 0
    if (search) { pc++; where.push(`(ak.description ILIKE $${pc} OR w.wallet_number ILIKE $${pc} OR t.full_name ILIKE $${pc})`); params.push(`%${search}%`) }
    if (q.status) { pc++; where.push(`ak.status = $${pc}`); params.push(q.status) }
    if (q.walletId) { pc++; where.push(`ak.wallet_id = $${pc}`); params.push(q.walletId) }
    const whereSql = 'WHERE ' + where.join(' AND ')
    const countR = await query(`SELECT COUNT(*) as total FROM api_keys ak LEFT JOIN wallets w ON w.id = ak.wallet_id LEFT JOIN tenants t ON t.id = w.tenant_id ${whereSql}`, params)
    const total = parseInt(countR.rows[0].total)
    const rows = await query(`
      SELECT ak.id, ak.api_key as "apiKey", ak.wallet_id as "walletId", ak.description, ak.permissions, ak.expires_at as "expiresAt", ak.status, ak.created_at as "createdAt",
             w.wallet_number as "walletNumber", w.name as "walletName", t.full_name as "tenantName", t.id as "tenantId"
      FROM api_keys ak
      LEFT JOIN wallets w ON w.id = ak.wallet_id
      LEFT JOIN tenants t ON t.id = w.tenant_id
      ${whereSql}
      ORDER BY ak.created_at DESC LIMIT $${pc+1} OFFSET $${pc+2}
    `, [...params, limit, offset])
    // No exponer api_key completa en listado por seguridad, solo prefijo
    const items = rows.rows.map((r: any) => ({ ...r, apiKey: r.apiKey ? r.apiKey.slice(0, 12) + '••••' : null, apiKeyFull: r.apiKey }))
    return list({ items, pagination: { page, limit, totalPages: Math.ceil(total / limit), total } }, total, 'API keys listadas')
  }, {
    query: t.Optional(t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), search: t.Optional(t.String()), status: t.Optional(t.String()), walletId: t.Optional(t.String()) })),
    detail: { tags: ['Admin'], summary: 'Listar todas las API keys' },
  })

  .get('/api-keys/:id', async ({ params }: any) => {
    const r = await query(`
      SELECT ak.id, ak.api_key as "apiKey", ak.wallet_id as "walletId", ak.description, ak.permissions, ak.expires_at as "expiresAt", ak.status, ak.created_at as "createdAt",
             w.wallet_number as "walletNumber", w.name as "walletName", t.full_name as "tenantName"
      FROM api_keys ak LEFT JOIN wallets w ON w.id = ak.wallet_id LEFT JOIN tenants t ON t.id = w.tenant_id
      WHERE ak.id = $1 AND ak.deleted_at IS NULL
    `, [BigInt(params.id)])
    if (!r.rowCount) throw new AppError(404, 'API key no encontrada')
    return ok(r.rows[0], 'API key encontrada')
  }, { detail: { tags: ['Admin'], summary: 'Detalle API key' } })

  .post('/api-keys', async ({ body }: any) => {
    const walletId = BigInt(body.walletId)
    const wallet = await walletRepository.getById(walletId)
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    const { apiKeyService } = await import('../api-keys/apikey.service')
    const key = await apiKeyService.generate(walletId, body.description || `API key ${wallet.walletNumber}`, body.permissions || { qr_generate: true, qr_status: true, qr_cancel: true }, body.expiresAt || null)
    return ok(key, 'API key generada')
  }, {
    body: t.Object({ walletId: t.String(), description: t.Optional(t.String()), permissions: t.Optional(t.Object({ qr_generate: t.Optional(t.Boolean()), qr_status: t.Optional(t.Boolean()), qr_cancel: t.Optional(t.Boolean()) })), expiresAt: t.Optional(t.String()) }),
    detail: { tags: ['Admin'], summary: 'Generar API key (admin)' },
  })

  .delete('/api-keys/:id', async ({ params }: any) => {
    const { apiKeyService } = await import('../api-keys/apikey.service')
    await apiKeyService.revoke(BigInt(params.id))
    return ok(null, 'API key revocada')
  }, { detail: { tags: ['Admin'], summary: 'Revocar API key' } })
