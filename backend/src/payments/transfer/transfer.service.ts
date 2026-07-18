import { AppError } from '../../shared/errors/app-error'
import { query } from '../../shared/database/pool'
import { transferRepository, type TransferRow } from './transfer.repository'
import { eventBus } from '../events/event-bus'
import { notifService } from '../notification/notif.service'
import { dispatch } from '../webhooks/webhook.service'
import { storeIdempotencyResponse } from '../../shared/middleware/idempotency'
import { logger } from '../../shared/logger'

export const transferService = {
  async p2p(
    senderWalletId: bigint,
    receiverWalletId: bigint,
    amount: number,
    options?: {
      description?: string
      idempotencyKey?: string
      ip?: string
      deviceId?: string
      userId?: bigint
    }
  ): Promise<TransferRow> {
    if (amount <= 0) throw new AppError(400, 'Monto inválido')
    if (senderWalletId === receiverWalletId) throw new AppError(400, 'No puedes transferirte a ti mismo')

    const senderRow = await query('SELECT * FROM wallets WHERE id = $1 AND deleted_at IS NULL', [senderWalletId])
    const receiverRow = await query('SELECT * FROM wallets WHERE id = $1 AND deleted_at IS NULL', [receiverWalletId])
    if (!senderRow.rowCount || !receiverRow.rowCount) throw new AppError(404, 'Billetera no encontrada')
    const sender = senderRow.rows[0] as any
    const receiver = receiverRow.rows[0] as any

    if (parseFloat(sender.balance) < amount) throw new AppError(400, 'Saldo insuficiente')
    if (parseFloat(sender.available_balance) < amount) throw new AppError(400, 'Saldo disponible insuficiente')

    const fee = 0
    const total = amount

    const transfer = await transferRepository.create({
      senderWalletId, receiverWalletId, amount, fee, total, description: options?.description,
      referenceType: 'p2p',
    })

    await query('UPDATE wallets SET balance = balance - $1, available_balance = available_balance - $1 WHERE id = $2',
      [total, senderWalletId])
    await query('UPDATE wallets SET balance = balance + $1, available_balance = available_balance + $1 WHERE id = $2',
      [amount, receiverWalletId])
    await transferRepository.updateStatus(transfer.id, 'completed')

    const result = await transferRepository.getById(transfer.id) as TransferRow

    eventBus.emit('transfer.completed', { transferId: transfer.id, senderWalletId, receiverWalletId, amount, fee })

    const [senderUserIds, receiverUserIds] = await Promise.all([
      notifService.getWalletUserIds(senderWalletId),
      notifService.getWalletUserIds(receiverWalletId),
    ])
    const senderName = (sender as any).name || 'Remitente'
    const receiverName = (receiver as any).name || 'Destinatario'
    await Promise.all([
      ...senderUserIds.map(uid => notifService.transferSent(uid, amount, receiverName, transfer.id)),
      ...receiverUserIds.map(uid => notifService.transferReceived(uid, amount, senderName, transfer.id)),
    ])

    if (options?.idempotencyKey) {
      await storeIdempotencyResponse(options.idempotencyKey, result)
    }

    await dispatch('transfer.completed', {
      transferId: String(transfer.id),
      senderWalletId: String(senderWalletId),
      receiverWalletId: String(receiverWalletId),
      amount,
      fee,
      status: 'completed',
    })

    logger.info('P2P transfer completed', {
      transferId: transfer.id,
      amount,
      fee,
      senderWalletId,
      receiverWalletId,
    })

    return result
  },

  async listByWallet(walletId: bigint, limit = 20, offset = 0) {
    return transferRepository.listByWallet(walletId, limit, offset)
  },

  async getById(id: bigint): Promise<TransferRow | null> {
    return transferRepository.getById(id)
  },
}
