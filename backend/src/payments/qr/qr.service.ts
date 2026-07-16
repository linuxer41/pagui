import { AppError } from '../../shared/errors/app-error'
import { qrRepository, type QrRow } from './qr.repository'
import { accountRepository } from '../../banking/account/account.repository'
import { bankCredentialRepository } from '../../banking/credential/bank-credential.repository'
import { BanecoAdapter } from '../../banking/integration/baneco.adapter'
import { settlementRepository } from '../settlement/settlement.repository'
import { logger } from '../../shared/logger'
import { eventBus } from '../events/event-bus'
import { paymentQueueService } from '../sync/payment-queue.service'

export const qrService = {
  async generate(data: {
    accountId?: bigint; amount: number; currency?: string; description?: string; dueDate?: string
    singleUse?: boolean; modifyAmount?: boolean; walletId?: bigint; userId?: bigint
  }): Promise<QrRow> {
    const businessAccount = await accountRepository.getBusinessAccount()
    if (!businessAccount) throw new AppError(500, 'Cuenta empresarial no configurada')

    const bcid = (businessAccount as any).bank_credential_id
    if (!bcid) throw new AppError(400, 'Credencial bancaria empresarial no configurada')
    const cred = await bankCredentialRepository.getById(bcid)
    if (!cred) throw new AppError(400, 'Credencial bancaria empresarial no encontrada')
    const credRow = cred as any

    const adapter = new BanecoAdapter(credRow.api_base_url, credRow.encryption_key)
    const token = await adapter.getToken(credRow.username, credRow.password)
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

    const result = await adapter.generateQr(token, transactionId, credRow.account_number, data.amount, {
      description: data.description, dueDate: data.dueDate,
      singleUse: data.singleUse, modifyAmount: data.modifyAmount, currency: data.currency,
    })

    const qr = await qrRepository.create({
      qrId: result.qrId, transactionId, accountId: businessAccount.id,
      bankCredentialId: bcid, userId: data.userId,
      amount: data.amount, currency: data.currency || 'BOB',
      description: data.description, dueDate: data.dueDate || '2025-12-31',
      qrImage: result.qrImage, singleUse: data.singleUse,
      modifyAmount: data.modifyAmount, walletId: data.walletId,
    })

    paymentQueueService.enqueueSync(result.qrId)
    eventBus.emit('qr.created', { qrId: result.qrId, accountId: businessAccount.id, amount: data.amount })
    return qr
  },

  async list(accountId: bigint, filters?: Parameters<typeof qrRepository.listByAccount>[1]) {
    return qrRepository.listByAccount(accountId, filters)
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

    const qrBcid = (qr as any).bank_credential_id
    const cred = qrBcid ? await bankCredentialRepository.getById(qrBcid) : null
    if (cred) {
      try {
        const credRow = cred as any
        const adapter = new BanecoAdapter(credRow.api_base_url, credRow.encryption_key)
        const token = await adapter.getToken(credRow.username, credRow.password)
        await adapter.cancelQr(token, qrId)
      } catch (e) {
        logger.error('Error cancelando QR en banco', { error: String(e), qrId })
      }
    }

    await qrRepository.updateStatus(qrId, 'cancelled')
    eventBus.emit('qr.cancelled', { qrId, accountId: qr.accountId })
  },

  async handleBanecoNotification(data: any): Promise<void> {
    const { qrId, transactionId, amount, paymentDate, paymentHour, currency, senderName,
      senderDocumentId, senderAccount, senderBankCode } = data

    const qr = await qrRepository.getByQrId(qrId)
    if (!qr) throw new AppError(404, 'QR no encontrado')

    const movement = await accountRepository.createMovement({
      accountId: qr.accountId, movementType: 'qr_payment', amount,
      balanceBefore: 0, balanceAfter: 0,
      description: `Pago QR ${qrId}`,
      qrId, transactionId,
      paymentDate: paymentDate || new Date().toISOString(),
      currency: currency || qr.currency,
      senderName, senderDocumentId, senderAccount, senderBankCode,
      referenceId: qr.transactionId, referenceType: 'qr',
      status: 'completed',
    })

    await qrRepository.updateStatus(qrId, 'used')

    // Crear settlement si el QR tiene user_id (cliente asociado)
    if (qr.userId) {
      try {
        const userAccounts = await accountRepository.listByUser(qr.userId)
        const userAccount = userAccounts.find(a => a.accountLevel === 'client')
        if (!userAccount) {
          logger.warn('No client account found for user, skipping settlement', { userId: qr.userId, qrId })
          return
        }

        let commissionRate: number
        let toBankCredentialId: bigint | null

        if (userAccount.accountSubtype === 'administered') {
          commissionRate = parseFloat(process.env.IATHINGS_CLIENT_COMMISSION_RATE || '0.01')
          toBankCredentialId = null
        } else {
          const clientCreds = await bankCredentialRepository.list({
            userId: qr.userId,
            type: 'client',
            status: 'active',
          })
          if (clientCreds.length === 0) {
            logger.warn('No bank credentials for passthrough client, skipping settlement', { userId: qr.userId, qrId })
            return
          }
          const clientCred = clientCreds[0] as any
          commissionRate = clientCred.commission_rate || 0
          toBankCredentialId = clientCred.id
        }

        const grossAmount = amount
        const commission = grossAmount * (commissionRate / 100)
        const netAmount = grossAmount - commission

        const settlement = await settlementRepository.create({
          fromAccountId: qr.accountId,
          toBankCredentialId,
          userId: qr.userId,
          grossAmount,
          commission,
          commissionRate,
          netAmount,
          currency: currency || qr.currency,
          qrCodeId: qr.id,
        })

        logger.info('Settlement created', {
          settlementId: settlement.id, userId: qr.userId, netAmount, subtype: userAccount.accountSubtype,
        })
      } catch (e: any) {
        logger.error('Error creating settlement', { error: e.message, qrId })
      }
    }

    eventBus.emit('qr.paid', { qrId, accountId: qr.accountId, amount, movementId: movement.id })
  },
}
