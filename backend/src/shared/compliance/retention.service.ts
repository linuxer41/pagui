import { query } from '../database/pool'
import { logger } from '../logger'

interface RetentionPolicy {
  table: string
  retentionDays: number
  deleteBeforeColumn?: string
  archiveBeforeDelete?: boolean
}

const POLICIES: RetentionPolicy[] = [
  { table: 'audit_logs', retentionDays: 365, deleteBeforeColumn: 'created_at' },
  { table: 'auth_tokens', retentionDays: 90, deleteBeforeColumn: 'created_at' },
  { table: 'idempotency_keys', retentionDays: 30, deleteBeforeColumn: 'created_at' },
  { table: 'outgoing_webhook_jobs', retentionDays: 30, deleteBeforeColumn: 'created_at' },
  { table: 'payment_sync_status', retentionDays: 90, deleteBeforeColumn: 'created_at' },
  { table: 'reconciliation_logs', retentionDays: 365, deleteBeforeColumn: 'created_at' },
  { table: 'notifications', retentionDays: 180, deleteBeforeColumn: 'created_at' },
  { table: 'fraud_alerts', retentionDays: 730, deleteBeforeColumn: 'created_at', archiveBeforeDelete: true },
]

export async function applyRetentionPolicies(dryRun = false): Promise<{
  deleted: number
  archived: number
  details: { table: string; deleted: number; archived: number }[]
}> {
  let totalDeleted = 0
  let totalArchived = 0
  const details: { table: string; deleted: number; archived: number }[] = []

  for (const policy of POLICIES) {
    const column = policy.deleteBeforeColumn || 'created_at'

    try {
      // Archive first if needed
      let archived = 0
      const cutoffParam = `${policy.retentionDays} days`

      if (policy.archiveBeforeDelete && !dryRun) {
        const archiveResult = await query(
          `CREATE TABLE IF NOT EXISTS ${policy.table}_archive AS SELECT * FROM ${policy.table} WHERE ${column} < CURRENT_TIMESTAMP - $1::interval`,
          [cutoffParam]
        )
        archived = archiveResult.rowCount || 0
        totalArchived += archived
      }

      if (!dryRun) {
        const result = await query(
          `DELETE FROM ${policy.table} WHERE ${column} < CURRENT_TIMESTAMP - $1::interval`,
          [cutoffParam]
        )
        const deleted = result.rowCount || 0
        totalDeleted += deleted
        details.push({ table: policy.table, deleted, archived })
        if (deleted > 0) {
          logger.info('Retention cleanup', { table: policy.table, deletedRecords: deleted })
        }
      } else {
        const result = await query(
          `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${column} < CURRENT_TIMESTAMP - $1::interval`,
          [cutoffParam]
        )
        const toDelete = parseInt(result.rows[0]?.count || '0')
        details.push({ table: policy.table, deleted: toDelete, archived: 0 })
      }
    } catch (err) {
      logger.error('Retention policy failed', { table: policy.table, error: String(err) })
      details.push({ table: policy.table, deleted: 0, archived: 0 })
    }
  }

  return { deleted: totalDeleted, archived: totalArchived, details }
}

export async function getRetentionStatus() {
  const results: { table: string; policyDays: number; currentRecords: number }[] = []

  for (const policy of POLICIES) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM ${policy.table}`
      )
      results.push({
        table: policy.table,
        policyDays: policy.retentionDays,
        currentRecords: parseInt(result.rows[0]?.count || '0'),
      })
    } catch {
      results.push({ table: policy.table, policyDays: policy.retentionDays, currentRecords: -1 })
    }
  }

  return results
}
