import { AppError } from '../../shared/errors/app-error'
import { settlementRepository } from './settlement.repository'
import { accountRepository } from '../../banking/account/account.repository'
import { bankCredentialRepository } from '../../banking/credential/bank-credential.repository'
import { BanecoAdapter } from '../../banking/integration/baneco.adapter'
import { logger } from '../../shared/logger'

export const settlementService = {
  async processPending() {
    const pending = await settlementRepository.getPending()
    for (const s of pending) {
      try {
        await this.process(s.id)
      } catch (e: any) {
        logger.error('Settlement failed', { settlementId: s.id, error: e.message })
        await settlementRepository.updateStatus(s.id, 'failed', { errorMessage: e.message })
      }
    }
  },

  async process(settlementId: bigint) {
    const settlement = await settlementRepository.getById(settlementId)
    if (!settlement) throw new AppError(404, 'Settlement no encontrado')
    if (settlement.status !== 'pending') return

    const businessAccount = await accountRepository.getById(settlement.fromAccountId)
    if (!businessAccount) throw new AppError(404, 'Cuenta empresarial no encontrada')

    const businessCred = await bankCredentialRepository.getById(businessAccount.bankCredentialId)
    if (!businessCred) throw new AppError(400, 'Credencial empresarial no configurada')

    const businessRow = businessCred as any
    const adapter = new BanecoAdapter(businessRow.api_base_url, businessRow.encryption_key)
    const token = await adapter.getToken(businessRow.username, businessRow.password)

    let clientAccountNumber: string

    if (settlement.toBankCredentialId) {
      const clientCred = await bankCredentialRepository.getById(settlement.toBankCredentialId)
      if (!clientCred) throw new AppError(400, 'Credencial del cliente no encontrada')
      clientAccountNumber = clientCred.accountNumber
    } else {
      const iathingsAcct = process.env.IATHINGS_CLIENT_ACCOUNT_NUMBER
      if (!iathingsAcct) {
        throw new AppError(500, 'IATHINGS_CLIENT_ACCOUNT_NUMBER no configurado en variables de entorno')
      }
      clientAccountNumber = iathingsAcct
    }

    const reference = `STL${settlementId}${Date.now()}`.toUpperCase()

    await adapter.generateQr(token, reference, clientAccountNumber, settlement.netAmount, {
      description: `Liquidación #${settlementId}`,
      singleUse: true, modifyAmount: false, currency: settlement.currency,
    })

    const movement = await accountRepository.createMovement({
      accountId: settlement.fromAccountId,
      movementType: 'settlement',
      amount: settlement.netAmount,
      balanceBefore: 0, balanceAfter: 0,
      description: `Liquidación #${settlementId} a cliente`,
      currency: settlement.currency,
      referenceId: `STL-${settlementId}`,
      referenceType: 'settlement',
      settlementId,
      status: 'completed',
    })

    await settlementRepository.updateStatus(settlementId, 'completed', {
      reference,
      accountMovementId: movement.id,
    })

    logger.info('Settlement completed', { settlementId, reference, netAmount: settlement.netAmount })
  },

  async listByUser(userId: bigint, filters?: Parameters<typeof settlementRepository.listByUser>[1]) {
    return settlementRepository.listByUser(userId, filters)
  },

  async getPendingTotal(userId: bigint): Promise<number> {
    const result = await settlementRepository.listByUser(userId, { status: 'pending' })
    return result.settlements.reduce((sum, s) => sum + s.netAmount, 0)
  },
}
