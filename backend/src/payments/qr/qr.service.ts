import { AppError } from '../../shared/errors/app-error'
import { qrRepository, type QrRow } from './qr.repository'
import { walletRepository } from '../../banking/wallet/wallet.repository'
import { BanecoAdapter } from '../../banking/integration/baneco.adapter'
import { resolveCredentials } from '../../banking/credential/credential-resolver'
import { settlementRepository } from '../settlement/settlement.repository'
import { logger } from '../../shared/logger'
import { eventBus } from '../events/event-bus'
import { notifService } from '../notification/notif.service'
import { paymentQueueService } from '../sync/payment-queue.service'
import { query } from '../../shared/database/pool'

function defaultDueDate(days = 30): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const qrService = {
  async generate(data: {
    walletId?: bigint; amount: number; currency?: string; description?: string; dueDate?: string
    singleUse?: boolean; modifyAmount?: boolean; transactionId?: string; userId?: bigint
  }): Promise<QrRow> {
    let targetWallet
    if (data.walletId) {
      targetWallet = await walletRepository.getById(data.walletId)
      if (!targetWallet) throw new AppError(404, 'Billetera no encontrada')
    } else {
      targetWallet = await walletRepository.getBusinessAccount()
      if (!targetWallet) throw new AppError(500, 'Billetera empresarial no configurada')
    }

    // La credencial Baneco se resuelve desde collection_config (no desde wallets)
    const cc = await query(
      `SELECT baneco_credential_id FROM collection_config WHERE wallet_id = $1 AND is_active = true AND deleted_at IS NULL LIMIT 1`,
      [targetWallet.id]
    )
    const bcid: bigint | null = cc.rowCount ? (cc.rows[0].baneco_credential_id as bigint | null) : null
    const cred = await resolveCredentials(bcid)

    const adapter = new BanecoAdapter(cred.api_base_url, cred.encryption_key)
    const token = await adapter.getToken(cred.username, cred.password)
    const transactionId = data.transactionId
      ? String(data.transactionId)
      : `TXN${Date.now()}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

    const dueDate = data.dueDate || defaultDueDate()

    const result = await adapter.generateQr(token, transactionId, cred.account_number, data.amount, {
      description: data.description, dueDate,
      singleUse: data.singleUse, modifyAmount: data.modifyAmount, currency: data.currency,
    })

    const qr = await qrRepository.create({
      qrId: result.qrId, transactionId, walletId: targetWallet.id,
      banecoCredentialId: bcid, userId: data.userId,
      amount: data.amount, currency: data.currency || 'BOB',
      description: data.description, dueDate,
      qrImage: result.qrImage, singleUse: data.singleUse,
      modifyAmount: data.modifyAmount,
    })

    paymentQueueService.enqueueSync(result.qrId)
    eventBus.emit('qr.created', { qrId: result.qrId, walletId: targetWallet.id, amount: data.amount })
    return qr
  },

  async list(walletId: bigint, filters?: Parameters<typeof qrRepository.listByAccount>[1]) {
    return qrRepository.listByAccount(walletId, filters)
  },

  async listByUser(userId: bigint, filters?: Parameters<typeof qrRepository.listByUser>[1]) {
    return qrRepository.listByUser(userId, filters)
  },

  async getDetails(qrId: string): Promise<QrRow | null> {
    return qrRepository.getByQrId(qrId)
  },

  async getPayments(qrId: string) {
    return qrRepository.getPayments(qrId)
  },

  async cancel(qrId: string): Promise<void> {
    const qr = await qrRepository.getByQrId(qrId)
    if (!qr) throw new AppError(404, 'QR no encontrado')
    if (qr.status !== 'active') throw new AppError(400, 'El QR no está activo')

    const qrBcid = (qr as any).baneco_credential_id
    const cred = await resolveCredentials(qrBcid)
    try {
      const adapter = new BanecoAdapter(cred.api_base_url, cred.encryption_key)
      const token = await adapter.getToken(cred.username, cred.password)
      await adapter.cancelQr(token, qrId)
    } catch (e) {
      logger.error('Error cancelando QR en banco', { error: String(e), qrId })
    }

    await qrRepository.updateStatus(qrId, 'cancelled')
    eventBus.emit('qr.cancelled', { qrId, walletId: qr.walletId })
  },

  async handleBanecoNotification(data: any): Promise<void> {
    const { qrId, transactionId, amount, paymentDate, paymentHour, currency, senderName,
      senderDocumentId, senderAccount, senderBankCode } = data

    const qr = await qrRepository.getByQrId(qrId)
    if (!qr) throw new AppError(404, 'QR no encontrado')

    await qrRepository.updateStatus(qrId, 'used')

    // Si el QR tiene user_id, determinar el tipo de recaudación
    if (qr.userId) {
      try {
        const clientConfigs = await query(`
          SELECT * FROM collection_config WHERE wallet_id = $1 AND is_active = true LIMIT 1
        `, [qr.walletId])
        if (!clientConfigs.rowCount) {
          logger.warn('No collection config for wallet, skipping', { walletId: qr.walletId, qrId })
          return
        }
        const clientConfig = clientConfigs.rows[0] as any

        if (clientConfig.collection_type === 'direct') {
          // === Flujo Directo: dinero va directo al banco del comercio ===
          const rate = clientConfig.commission_rate || 0
          const commission = amount * (rate / 100)
          const { directTransactionService } = await import('../../collection/direct-transaction.service')
          await directTransactionService.create({
            userId: qr.userId,
            configId: clientConfig.id,
            qrCodeId: qr.id,
            grossAmount: amount,
            commission,
            commissionRate: rate,
            currency: currency || qr.currency,
            reference: transactionId,
          })
          logger.info('Direct transaction created', { userId: qr.userId, grossAmount: amount, commission })
        } else {
          // === Flujo Gateway: crear wallet_movement + settlement ===
          const movement = await walletRepository.createMovement({
            walletId: qr.walletId, movementType: 'qr_payment', amount,
            balanceBefore: 0, balanceAfter: 0,
            description: `Pago QR ${qrId}`,
            qrId, transactionId,
            paymentDate: paymentDate || new Date().toISOString(),
            currency: currency || qr.currency,
            senderName, senderDocumentId, senderAccount, senderBankCode,
            referenceId: qr.transactionId, referenceType: 'qr',
            status: 'completed',
          })

          const userWallets = await walletRepository.listByUser(qr.userId)
          const userWallet = userWallets.find(a => a.level === 'bronze')
          if (!userWallet) {
            logger.warn('No wallet found for user, skipping settlement', { userId: qr.userId, qrId })
            return
          }

          const commissionRate = clientConfig.use_default
            ? parseFloat(process.env.IATHINGS_CLIENT_COMMISSION_RATE || '0.01')
            : 0
          const grossAmount = amount
          const commission = grossAmount * (commissionRate / 100)
          const netAmount = grossAmount - commission

          const settlement = await settlementRepository.create({
            fromWalletId: qr.walletId,
            configId: clientConfig.id,
            userId: qr.userId,
            grossAmount,
            commission,
            commissionRate,
            netAmount,
            currency: currency || qr.currency,
            qrCodeId: qr.id,
          })

          logger.info('Settlement created', {
            settlementId: settlement.id, userId: qr.userId, netAmount, walletType: userWallet.type,
          })

          notifService.qrPaymentReceived(qr.userId, amount, qr.description || 'Pago QR', qrId, senderName)
            .catch(e => logger.error('Failed to send QR payment notification', { error: e.message, qrId }))
        }
      } catch (e: any) {
        logger.error('Error processing payment notification', { error: e.message, qrId })
      }
      return
    }

    // QR sin userId — solo registrar movimiento (legacy/anon)
    const movement = await walletRepository.createMovement({
      walletId: qr.walletId, movementType: 'qr_payment', amount,
      balanceBefore: 0, balanceAfter: 0,
      description: `Pago QR ${qrId}`,
      qrId, transactionId,
      paymentDate: paymentDate || new Date().toISOString(),
      currency: currency || qr.currency,
      senderName, senderDocumentId, senderAccount, senderBankCode,
      referenceId: qr.transactionId, referenceType: 'qr',
      status: 'completed',
    })

    eventBus.emit('qr.paid', { qrId, walletId: qr.walletId, amount, movementId: movement.id })

    notifService.getWalletUserIds(qr.walletId).then(userIds =>
      Promise.all(userIds.map(uid =>
        notifService.qrPaymentReceived(uid, amount, qr.description || 'Pago QR', qrId, senderName)
      ))
    ).catch(e => logger.error('Failed to notify QR payment to wallet users', { error: e.message, qrId }))
  },
}
