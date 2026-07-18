import { AppError } from '../../shared/errors/app-error'
import { walletRepository, type WalletRow, type WalletMovementRow } from './wallet.repository'
import { generateWalletNumber } from './wallet-number.service'
import { nextSnowflake } from '../../shared/snowflake'
import { query } from '../../shared/database/pool'

let _walletSeq: number | null = null

async function getWalletSeq(): Promise<number> {
  if (_walletSeq === null) {
    const r = await query('SELECT COUNT(*)::int AS c FROM wallets WHERE deleted_at IS NULL')
    _walletSeq = (r.rows[0]?.c || 0) + 1
  }
  return _walletSeq++
}

export const walletService = {
  async create(data: {
    type: string; level?: string; name?: string; currency?: string
    banecoCredentialId?: bigint; tenantId?: bigint; isCollection?: boolean; isDefault?: boolean
  }): Promise<WalletRow> {
    const num = generateWalletNumber(data.type, await getWalletSeq())
    const wallet = await walletRepository.create({
      walletNumber: num, type: data.type, level: data.level, name: data.name,
      currency: data.currency || 'BOB', banecoCredentialId: data.banecoCredentialId,
      tenantId: data.tenantId, isCollection: data.isCollection, isDefault: data.isDefault,
    })
    return wallet
  },

  getById(id: bigint): Promise<WalletRow | null> {
    return walletRepository.getById(id)
  },

  listByUser(userId: bigint) {
    return walletRepository.listByUser(userId)
  },

  listByTenant(tenantId: bigint) {
    return walletRepository.listByTenant(tenantId)
  },

  listAll(filters: Parameters<typeof walletRepository.listAll>[0]) {
    return walletRepository.listAll(filters)
  },

  getMovements(walletId: bigint, filters: Parameters<typeof walletRepository.getMovements>[1]) {
    return walletRepository.getMovements(walletId, filters)
  },

  getStats(walletId: bigint) {
    return walletRepository.getStats(walletId)
  },

  async createMovement(data: Parameters<typeof walletRepository.createMovement>[0]): Promise<WalletMovementRow> {
    return walletRepository.createMovement(data)
  },

  async createCollection(tenantId: bigint): Promise<WalletRow> {
    const wallet = await walletService.create({
      type: 'standard', name: 'Collectiones', isCollection: true, tenantId,
    })
    return wallet
  },

  async getCollectionAccount(userId: bigint): Promise<WalletRow | null> {
    return walletRepository.getCollectionByUser(userId)
  },

  async setAsCollection(walletId: bigint): Promise<WalletRow | null> {
    return walletRepository.update(walletId, { isCollection: true })
  },
}
