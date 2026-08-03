import { apikeyRepository } from './apikey.repository'
import { AppError } from '../shared/errors/app-error'
import { query } from '../shared/database/pool'

function generateApiKeyString(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 40; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return `pg_${result}`
}

export const apiKeyService = {
  async verifyApiKey(apiKey: string): Promise<{
    isValid: boolean; walletId?: bigint; permissions?: Record<string, boolean>
  }> {
    const key = await apikeyRepository.findByKey(apiKey)
    if (!key || key.status !== 'active') return { isValid: false }

    if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
      await apikeyRepository.markExpired(key.id)
      return { isValid: false }
    }

    return { isValid: true, walletId: key.walletId, permissions: key.permissions }
  },

  async generate(walletId: bigint, description: string, permissions: Record<string, boolean>, expiresAt?: string | null) {
    const apiKey = generateApiKeyString()
    const key = await apikeyRepository.create({ apiKey, walletId, description, permissions, expiresAt })
    return { ...key, apiKey }
  },

  async list(walletId: bigint) {
    return apikeyRepository.listByWallet(walletId)
  },

  async revoke(id: bigint) {
    const key = await apikeyRepository.getById(id)
    if (!key) throw new AppError(404, 'API key no encontrada')
    await apikeyRepository.revoke(id)
  },
}

export function generateApiKey(): string {
  return generateApiKeyString()
}
