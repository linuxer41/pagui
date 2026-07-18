import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { transferRepository } from '../transfer/transfer.repository'
import { logger } from '../../shared/logger'
import { AppError } from '../../shared/errors/app-error'
import { hash } from '../../shared/crypto'
import crypto from 'node:crypto'

interface NFCTransaction {
  nfcId: string
  senderWalletId: bigint
  receiverWalletId: bigint
  amount: number
  timestamp: number
  signature: string
  nonce: string
}

export async function createNFCOfflinePayload(params: {
  senderWalletId: bigint | string
  amount: number
  receiverWalletId: bigint | string
}) {
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const timestamp = Date.now()
  const nfcId = nextSnowflake()

  const payload = `${nfcId}:${params.senderWalletId}:${params.receiverWalletId}:${params.amount}:${timestamp}:${nonce}`
  const signature = hash(payload)

  return {
    nfcId,
    payload: {
      nfcId: String(nfcId),
      senderWalletId: String(params.senderWalletId),
      receiverWalletId: String(params.receiverWalletId),
      amount: params.amount,
      timestamp,
      nonce,
      signature,
    },
    qrData: JSON.stringify({
      type: 'nfc_offline',
      nfcId: String(nfcId),
      senderWalletId: String(params.senderWalletId),
      amount: params.amount,
      timestamp,
      signature,
    }),
  }
}

export async function processNFCTransaction(tx: NFCTransaction) {
  const expected = `${tx.nfcId}:${tx.senderWalletId}:${tx.receiverWalletId}:${tx.amount}:${tx.timestamp}:${tx.nonce}`
  if (hash(expected) !== tx.signature) {
    logger.warn('NFC invalid signature', { nfcId: tx.nfcId })
    throw new AppError(401, 'Firma NFC inválida')
  }

  const age = Date.now() - tx.timestamp
  if (age > 300_000) {
    throw new AppError(400, 'Transacción NFC expirada (más de 5 min)')
  }

  const existing = await query('SELECT id FROM transfers WHERE reference = $1', [`nfc-${tx.nfcId}`])
  if (existing.rows.length > 0) {
    throw new AppError(409, 'Transacción NFC ya procesada')
  }

  const senderResult = await query('SELECT * FROM wallets WHERE id = $1 AND deleted_at IS NULL', [tx.senderWalletId])
  if (!senderResult.rowCount) throw new AppError(400, 'Saldo insuficiente')
  const sender = senderResult.rows[0] as any
  if (parseFloat(sender.available_balance) < tx.amount) {
    throw new AppError(400, 'Saldo insuficiente')
  }

  const transfer = await transferRepository.create({
    senderWalletId: tx.senderWalletId,
    receiverWalletId: tx.receiverWalletId,
    amount: tx.amount,
    fee: 0,
    total: tx.amount,
    description: `Pago NFC offline ${tx.nfcId}`,
    reference: `nfc-${tx.nfcId}`,
    referenceType: 'nfc_offline',
  })

  await query('UPDATE wallets SET balance = balance - $1, available_balance = available_balance - $1 WHERE id = $2',
    [tx.amount, tx.senderWalletId])
  await transferRepository.updateStatus(transfer.id, 'completed')

  logger.info('NFC offline payment processed', {
    nfcId: tx.nfcId,
    amount: tx.amount,
    age: `${age}ms`,
  })

  return { transferId: transfer.id }
}

export async function syncPendingNFC(userId: bigint | string) {
  const pending = await query(
    `SELECT * FROM nfc_pending
     WHERE receiver_user_id = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at ASC`,
    [userId]
  )

  const results = []
  for (const p of pending.rows) {
    try {
      const result = await processNFCTransaction({
        nfcId: p.nfc_id,
        senderWalletId: p.sender_wallet_id,
        receiverWalletId: p.receiver_wallet_id,
        amount: parseFloat(p.amount),
        timestamp: new Date(p.created_at).getTime(),
        signature: p.signature,
        nonce: p.nonce,
      })
      await query("UPDATE nfc_pending SET status = 'completed' WHERE id = $1", [p.id])
      results.push(result)
    } catch {
      await query("UPDATE nfc_pending SET status = 'failed' WHERE id = $1", [p.id])
    }
  }

  return results
}
