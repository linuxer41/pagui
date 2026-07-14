import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { walletRepository } from '../wallet/wallet.repository'
import { transferRepository } from '../transfer/transfer.repository'
import { logger } from '../../shared/logger'

export type CashDirection = 'cash_in' | 'cash_out'

export interface AgentLocation {
  lat: number
  lng: number
  name: string
  address: string
  phone: string
  operatingHours: string
}

export async function registerAgent(params: {
  userId: bigint | string
  name: string
  phone: string
  address: string
  lat: number
  lng: number
  operatingHours?: string
}) {
  const wallet = await walletRepository.create({
    userId: BigInt(params.userId),
    name: params.name,
    type: 'agent',
    currency: 'BOB',
  })

  const id = nextSnowflake()
  await query(
    `INSERT INTO cash_agents (id, user_id, wallet_id, name, phone, address, lat, lng, operating_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, params.userId, wallet.id, params.name, params.phone, params.address,
     params.lat, params.lng, params.operatingHours || null]
  )

  logger.info('Cash agent registered', { agentId: id, name: params.name })
  return { agentId: id, walletId: wallet.id }
}

export async function processCashTransaction(params: {
  agentId: bigint | string
  userId: bigint | string
  userWalletId: bigint | string
  amount: number
  direction: CashDirection
  reference: string
}) {
  const agent = await query('SELECT wallet_id, name FROM cash_agents WHERE id = $1 AND is_active = TRUE', [params.agentId])
  if (agent.rows.length === 0) throw new Error('Agente no encontrado o inactivo')

  const fee = params.direction === 'cash_in' ? 0 : Math.round(params.amount * 0.01 * 100) / 100
  const total = params.direction === 'cash_out' ? params.amount + fee : params.amount

  if (params.direction === 'cash_in') {
    const senderWallet = await walletRepository.getById(BigInt(params.userWalletId))
    if (!senderWallet) throw new Error('Billetera no encontrada')

    const transfer = await transferRepository.create({
      senderWalletId: BigInt(agent.rows[0].wallet_id),
      receiverWalletId: BigInt(params.userWalletId),
      amount: params.amount,
      fee,
      total,
      description: `Cash-in en ${agent.rows[0].name}`,
      referenceType: 'cash_in',
    })
    await transferRepository.updateStatus(transfer.id, 'completed')

    await walletRepository.updateBalance(
      BigInt(params.userWalletId),
      senderWallet.balance + params.amount,
      senderWallet.availableBalance + params.amount
    )

    logger.info('Cash-in processed', { agentId: params.agentId, amount: params.amount })
    return { transferId: transfer.id, direction: 'cash_in' }
  } else {
    const senderWallet = await walletRepository.getById(BigInt(params.userWalletId))
    if (!senderWallet || senderWallet.availableBalance < total) throw new Error('Saldo insuficiente')

    const transfer = await transferRepository.create({
      senderWalletId: BigInt(params.userWalletId),
      receiverWalletId: BigInt(agent.rows[0].wallet_id),
      amount: params.amount,
      fee,
      total,
      description: `Cash-out en ${agent.rows[0].name}`,
      referenceType: 'cash_out',
    })
    await transferRepository.updateStatus(transfer.id, 'completed')

    await walletRepository.updateBalance(
      BigInt(params.userWalletId),
      senderWallet.balance - total,
      senderWallet.availableBalance - total
    )

    logger.info('Cash-out processed', { agentId: params.agentId, amount: params.amount, fee })
    return { transferId: transfer.id, direction: 'cash_out', fee }
  }
}

export async function getNearbyAgents(params: { lat: number; lng: number; radiusKm?: number }) {
  const radius = params.radiusKm || 5
  const result = await query(
    `SELECT id, name, address, phone, lat, lng, operating_hours,
            (6371 * acos(cos(radians($1)) * cos(radians(lat))
            * cos(radians(lng) - radians($2)) + sin(radians($1))
            * sin(radians(lat)))) AS distance_km
     FROM cash_agents
     WHERE is_active = TRUE
     HAVING distance_km < $3
     ORDER BY distance_km ASC
     LIMIT 20`,
    [params.lat, params.lng, radius]
  )
  return result.rows
}
