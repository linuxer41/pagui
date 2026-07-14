import { AppError } from '../../shared/errors/app-error'
import { walletRepository } from '../wallet/wallet.repository'
import { transferRepository, type TransferRow } from './transfer.repository'
import { eventBus } from '../events/event-bus'
import { evaluateFraud } from '../fraud/fraud.service'
import { dispatch } from '../webhooks/webhook.service'
import { storeIdempotencyResponse } from '../../shared/middleware/idempotency'
import { feeService } from '../fee/fee.service'
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

    const sender = await walletRepository.getById(senderWalletId)
    const receiver = await walletRepository.getById(receiverWalletId)
    if (!sender || !receiver) throw new AppError(404, 'Billetera no encontrada')

    if (sender.balance < amount) throw new AppError(400, 'Saldo insuficiente')
    if (sender.availableBalance < amount) throw new AppError(400, 'Saldo disponible insuficiente')

    if (options?.userId) {
      const fraudCheck = await evaluateFraud({
        userId: options.userId,
        walletId: senderWalletId,
        amount,
        ip: options.ip,
        deviceId: options.deviceId,
      })
      if (!fraudCheck.allowed) {
        throw new AppError(403, `Transferencia bloqueada por seguridad (score: ${fraudCheck.score}): ${fraudCheck.reasons.join(', ')}`)
      }
    }

    const fee = await feeService.calculateFee(senderWalletId, amount)
    const total = amount + fee

    if (sender.availableBalance < total) throw new AppError(400, 'Saldo insuficiente para cubrir monto + comisión')

    const transfer = await transferRepository.create({
      senderWalletId, receiverWalletId, amount, fee, total, description: options?.description,
      referenceType: 'p2p',
    })

    await walletRepository.updateBalance(sender.id, sender.balance - total, sender.availableBalance - total)
    await walletRepository.updateBalance(receiver.id, receiver.balance + amount, receiver.availableBalance + amount)
    await transferRepository.updateStatus(transfer.id, 'completed')

    const result = await transferRepository.getById(transfer.id) as TransferRow

    eventBus.emit('transfer.completed', { transferId: transfer.id, senderWalletId, receiverWalletId, amount, fee })

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
