import { Elysia, t } from 'elysia'
import { pool } from '../shared/database/pool'
import { getMigrationStatus } from '../shared/database/migrate'
import { ok } from '../shared/response'
import * as os from 'os'

let startTime = Date.now()

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', () =>
    ok({
      status: 'ok',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
    }), {
    detail: { tags: ['Monitoring'], summary: 'Health check básico' },
  })

  .get('/api', async () => {
    try {
      await pool.query('SELECT 1')
      return ok({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() })
    } catch {
      return ok({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() })
    }
  }, {
    detail: { tags: ['Monitoring'], summary: 'Health check de API/DB' },
  })

  .get('/readiness', async () => {
    const checks = {
      database: false,
      memory: false,
    }

    try {
      await pool.query('SELECT 1')
      checks.database = true
    } catch {}

    const mem = process.memoryUsage()
    checks.memory = mem.heapUsed < 500 * 1024 * 1024

    const healthy = Object.values(checks).every(Boolean)

    return ok({
      status: healthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    })
  }, {
    detail: { tags: ['Monitoring'], summary: 'Readiness check for k8s' },
  })

  .get('/liveness', async () => {
    return ok({ status: 'alive', timestamp: new Date().toISOString() })
  }, {
    detail: { tags: ['Monitoring'], summary: 'Liveness check for k8s' },
  })

  .get('/stats', () => {
    const mem = process.memoryUsage()
    const cpus = os.cpus()

    return ok({
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'unknown',
        loadAvg: os.loadavg(),
      },
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
    })
  }, {
    detail: { tags: ['Monitoring'], summary: 'Stats detalladas del servidor' },
  })

  .get('/migrations', async () => {
    const migrations = await getMigrationStatus()
    return ok({ migrations })
  }, {
    detail: { tags: ['Monitoring'], summary: 'Estado de migraciones' },
  })

  .get('/metrics', async () => {
    const dbResult = await pool.query(
      'SELECT count(*) as total FROM information_schema.tables WHERE table_schema = \'public\''
    )
    const { rows: activeUsers } = await pool.query(
      'SELECT count(*) as cnt FROM users WHERE status = \'active\''
    )
    const { rows: totalWallets } = await pool.query(
      'SELECT count(*) as cnt FROM wallets WHERE deleted_at IS NULL'
    )
    const { rows: totalTransfers } = await pool.query(
      'SELECT count(*) as cnt, coalesce(sum(amount), 0) as total_amount FROM transfers'
    )

    const mem = process.memoryUsage()

    return ok({
      database: {
        tables: parseInt(dbResult.rows[0].total),
        activeUsers: parseInt(activeUsers[0].cnt),
        wallets: parseInt(totalWallets[0].cnt),
      },
      transfers: {
        total: parseInt(totalTransfers[0].cnt),
        totalAmount: parseFloat(totalTransfers[0].total_amount),
      },
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
        rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
      },
      uptime: Math.floor((Date.now() - startTime) / 1000),
    })
  }, {
    detail: { tags: ['Monitoring'], summary: 'Métricas de negocio' },
  })
