import { walletPermissionRepository } from './wallet-permission.repository'
import { AppError } from '../../shared/errors/app-error'
import { walletRepository } from '../../banking/wallet/wallet.repository'

export const walletPermissionService = {
  async grantAccess(userId: bigint, walletId: bigint, role = 'viewer'): Promise<void> {
    const wallet = await walletRepository.getById(walletId)
    if (!wallet) throw new AppError(404, 'Billetera no encontrada')
    await walletPermissionRepository.upsert(userId, walletId, role)
  },

  async listByUser(userId: bigint) {
    return walletPermissionRepository.listByUser(userId)
  },

  async listByWallet(walletId: bigint) {
    return walletPermissionRepository.listByWallet(walletId)
  },

  async revokeAccess(userId: bigint, walletId: bigint): Promise<void> {
    await walletPermissionRepository.remove(userId, walletId)
  },
}
