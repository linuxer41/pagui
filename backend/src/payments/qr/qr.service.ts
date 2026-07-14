import { AppError } from '../../shared/errors/app-error'
import { qrRepository, type QrRow } from './qr.repository'
import { accountRepository } from '../../banking/account/account.repository'
import { bankCredentialRepository } from '../../banking/credential/bank-credential.repository'
import { BanecoAdapter } from '../../banking/integration/baneco.adapter'
import { eventBus } from '../events/event-bus'
import { paymentQueueService } from '../sync/payment-queue.service'

const BANCO_ECONOMICO_ID = 1n

export const qrService = {
  async generate(data: {
    accountId: bigint; amount: number; currency?: string; description?: string; dueDate?: string
    singleUse?: boolean; modifyAmount?: boolean; walletId?: bigint
  }): Promise<QrRow> {
    const account = await accountRepository.getById(data.accountId)
    if (!account) throw new AppError(404, 'Cuenta no encontrada')

    const cred = await bankCredentialRepository.getById(account.bankCredentialId)
    if (!cred) throw new AppError(400, 'Credencial bancaria no configurada')

    const adapter = new BanecoAdapter(cred.apiBaseUrl, cred.encryptionKey)
    const token = await adapter.getToken(cred.username, cred.password)
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

    const result = await adapter.generateQr(token, transactionId, account.accountNumber, data.amount, {
      description: data.description, dueDate: data.dueDate,
      singleUse: data.singleUse, modifyAmount: data.modifyAmount, currency: data.currency,
    })

    const qr = await qrRepository.create({
      qrId: result.qrId, transactionId, accountId: data.accountId,
      bankCredentialId: account.bankCredentialId,
      amount: data.amount, currency: data.currency || 'BOB',
      description: data.description, dueDate: data.dueDate || '2025-12-31',
      qrImage: result.qrImage, singleUse: data.singleUse,
      modifyAmount: data.modifyAmount, walletId: data.walletId,
    })

    paymentQueueService.enqueueSync(result.qrId)
    eventBus.emit('qr.created', { qrId: result.qrId, accountId: data.accountId, amount: data.amount })
    return qr
  },

  async list(accountId: bigint, filters?: Parameters<typeof qrRepository.listByAccount>[1]) {
    return qrRepository.listByAccount(accountId, filters)
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

    const cred = await bankCredentialRepository.getById(qr.bankCredentialId!)
    if (cred) {
      try {
        const adapter = new BanecoAdapter(cred.apiBaseUrl, cred.encryptionKey)
        const token = await adapter.getToken(cred.username, cred.password)
        await adapter.cancelQr(token, qrId)
      } catch (e) {
        console.error('Error cancelando QR en banco:', e)
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
    if (qr.singleUse) {
      await qrRepository.updateStatus(qrId, 'used')
    }

    eventBus.emit('qr.paid', { qrId, accountId: qr.accountId, amount, movementId: movement.id })
  },
}
