import { settlementRepository } from '../payments/settlement/settlement.repository'
import { walletRepository } from '../banking/wallet/wallet.repository'
import { walletService } from '../banking/wallet/wallet.service'
import { nextSnowflake } from '../shared/snowflake'
import { AppError } from '../shared/errors/app-error'
import { query } from '../shared/database/pool'

export const liquidationService = {
  async createManual(userId: bigint, bankAccountId: bigint, amount: number) {
    const wallet = await walletService.getCollectionAccount(userId)
    if (!wallet) throw new AppError(404, 'No tienes billetera de recaudación')

    const balance = Number(wallet.balance || 0)
    if (amount > balance) throw new AppError(400, 'El monto excede el saldo disponible')
    if (amount < 0.01) throw new AppError(400, 'El monto mínimo es 0.01 BOB')

    const movement = await walletRepository.createMovement({
      walletId: wallet.id,
      movementType: 'withdrawal',
      amount,
      balanceBefore: balance,
      balanceAfter: balance - amount,
      description: `Retiro manual a cuenta bancaria #${bankAccountId}`,
      currency: 'BOB',
      referenceId: String(bankAccountId),
      referenceType: 'manual_liquidation',
      status: 'completed',
    })

    const settlementId = nextSnowflake()
    const reference = `MANUAL-${settlementId}`
    await query(`
      INSERT INTO settlements (id, wallet_movement_id, from_wallet_id, user_id, gross_amount, commission, commission_rate, net_amount, currency, status, reference, settled_at)
      VALUES ($1, $2, $3, $4, $5, 0, 0, $5, 'BOB', 'completed', $6, CURRENT_TIMESTAMP)
    `, [settlementId, movement.id, wallet.id, userId, amount, reference])

    return { settlementId: String(settlementId), movementId: String(movement.id), amount }
  },

  async listByUser(userId: bigint, page = 1, limit = 50) {
    return settlementRepository.listByUser(userId, { page, limit })
  },
}
