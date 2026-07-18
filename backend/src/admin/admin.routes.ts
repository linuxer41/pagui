import { Elysia, t } from 'elysia'
import { query } from '../shared/database/pool'
import { userService } from '../identity/user.service'
import { tenantRepository } from '../identity/tenants/tenant.repository'
import { walletRepository } from '../banking/wallet/wallet.repository'
import { AppError } from '../shared/errors/app-error'
import { ok, list } from '../shared/response'
import { nextSnowflake } from '../shared/snowflake'
import { notifService } from '../payments/notification/notif.service'
import { Role } from '@pagui/shared'

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
      SELECT w.id, w.wallet_number as "walletNumber", w.name, w.type, w.balance, w.status
      FROM wallets w
      JOIN wallet_permissions wp ON w.id = wp.wallet_id AND wp.deleted_at IS NULL
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
        t.full_name as "tenantName", t.environment as "tenantEnvironment"
      FROM wallets w
      LEFT JOIN tenants t ON t.id = w.tenant_id
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
    return ok({ ...wallet, tenantName: tenantR.rows[0]?.fullName || null, tenantEnvironment: tenantR.rows[0]?.environment || null }, 'Billetera encontrada')
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
