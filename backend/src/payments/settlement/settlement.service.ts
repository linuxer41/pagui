import { AppError } from '../../shared/errors/app-error'
import { settlementRepository } from './settlement.repository'
import { walletRepository } from '../../banking/wallet/wallet.repository'
import { query } from '../../shared/database/pool'
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

    const businessConfig = await query(`
      SELECT * FROM collection_config WHERE is_active = true LIMIT 1
    `)
    if (!businessConfig.rowCount) throw new AppError(400, 'Configuración de recaudación no encontrada')
    const config = businessConfig.rows[0] as any

    const adapter = new BanecoAdapter(config.api_base_url, config.encryption_key)
    const token = await adapter.getToken(config.username, config.password)

    let clientAccountNumber: string

    if (settlement.configId) {
      const clientConfig = await query('SELECT * FROM collection_config WHERE id = $1 AND is_active = true', [settlement.configId])
      if (!clientConfig.rowCount) throw new AppError(400, 'Configuración del cliente no encontrada')
      clientAccountNumber = clientConfig.rows[0].account_number
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

    const movement = await walletRepository.createMovement({
      walletId: settlement.fromWalletId,
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
      walletMovementId: movement.id,
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
