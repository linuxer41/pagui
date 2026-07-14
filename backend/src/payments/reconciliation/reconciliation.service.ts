import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { logger } from '../../shared/logger'

export async function reconcile(params: {
  bankAccountId: bigint | string
  externalReference: string
  localAmount: number
  bankAmount: number
  source: string
  notes?: string
}) {
  const difference = Math.round((params.bankAmount - params.localAmount) * 100) / 100
  const status = Math.abs(difference) < 0.01 ? 'matched' : 'mismatch'

  const result = await query(
    `INSERT INTO reconciliation_logs
       (id, bank_account_id, source, external_reference, local_amount, bank_amount, difference, status, notes, reconciled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      nextSnowflake(),
      params.bankAccountId,
      params.source,
      params.externalReference,
      params.localAmount,
      params.bankAmount,
      difference,
      status,
      params.notes || null,
    ]
  )

  if (status === 'mismatch') {
    logger.warn('Reconciliation mismatch', {
      accountId: params.bankAccountId,
      ref: params.externalReference,
      local: params.localAmount,
      bank: params.bankAmount,
      diff: difference,
    })
  }

  return { id: result.rows[0].id, status, difference }
}

export async function getReconciliationLogs(accountId: bigint | string, limit = 50) {
  const result = await query(
    `SELECT * FROM reconciliation_logs
     WHERE bank_account_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [accountId, limit]
  )
  return result.rows
}

export async function getPendingReconciliations(userId: bigint | string) {
  const result = await query(
    `SELECT r.*, a.account_number, a.alias
     FROM reconciliation_logs r
     JOIN accounts a ON a.id = r.bank_account_id
     JOIN user_accounts ua ON ua.account_id = a.id
     WHERE ua.user_id = $1 AND r.status IN ('pending', 'mismatch')
     ORDER BY r.created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function reconcileAccount(accountId: bigint | string) {
  const transfers = await query(
    `SELECT id, amount, reference, created_at FROM transfers
     WHERE source_account_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
     ORDER BY created_at`
  )

  const results = []
  for (const t of transfers.rows) {
    const bankRef = t.reference || `TXN-${t.id}`
    const result = await reconcile({
      bankAccountId: accountId,
      externalReference: bankRef,
      localAmount: parseFloat(t.amount),
      bankAmount: parseFloat(t.amount),
      source: 'auto',
      notes: `Reconciliación automática transferencia ${t.id}`,
    })
    results.push(result)
  }

  logger.info('Account reconciled', { accountId, count: results.length })
  return results
}
