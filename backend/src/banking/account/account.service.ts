import { AppError } from '../../shared/errors/app-error'
import { accountRepository, type AccountRow, type AccountMovementRow } from './account.repository'
import { generateAccountNumber } from './account-number.service'
import { nextSnowflake } from '../../shared/snowflake'

let _accountSeq = 1

export const accountService = {
  async create(data: { accountType: string; accountLevel?: string; accountSubtype?: string; currency?: string; bankCredentialId?: bigint; userId: bigint }): Promise<AccountRow> {
    const num = generateAccountNumber(data.accountType, _accountSeq++)
    const account = await accountRepository.create({
      accountNumber: num, accountType: data.accountType, accountLevel: data.accountLevel, accountSubtype: data.accountSubtype,
      currency: data.currency || 'BOB', bankCredentialId: data.bankCredentialId, userId: data.userId,
    })
    await accountRepository.linkUser(data.userId, account.id)
    return account
  },

  getById(id: bigint): Promise<AccountRow | null> {
    return accountRepository.getById(id)
  },

  listByUser(userId: bigint) {
    return accountRepository.listByUser(userId)
  },

  listAll(filters: Parameters<typeof accountRepository.listAll>[0]) {
    return accountRepository.listAll(filters)
  },

  getMovements(accountId: bigint, filters: Parameters<typeof accountRepository.getMovements>[1]) {
    return accountRepository.getMovements(accountId, filters)
  },

  getStats(accountId: bigint) {
    return accountRepository.getStats(accountId)
  },

  async createMovement(data: Parameters<typeof accountRepository.createMovement>[0]): Promise<AccountMovementRow> {
    return accountRepository.createMovement(data)
  },
}
