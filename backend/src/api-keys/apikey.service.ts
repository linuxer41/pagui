import { apikeyRepository } from './apikey.repository'
import { query } from '../shared/database/pool'

function generateApiKeyString(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 40; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return `pg_${result}`
}

export const apiKeyService = {
  async verifyApiKey(apiKey: string): Promise<{
    isValid: boolean; accountId?: bigint; bankCredentialId?: bigint | null; permissions?: Record<string, boolean>
  }> {
    const key = await apikeyRepository.findByKey(apiKey)
    if (!key || key.status !== 'active') return { isValid: false }

    if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
      await apikeyRepository.markExpired(key.id)
      return { isValid: false }
    }

    return { isValid: true, accountId: key.accountId, bankCredentialId: key.bankCredentialId, permissions: key.permissions }
  },

  async generate(accountId: bigint, description: string, permissions: Record<string, boolean>, expiresAt?: string | null) {
    const apiKey = generateApiKeyString()
    const key = await apikeyRepository.create({ apiKey, accountId, description, permissions, expiresAt })
    return { ...key, apiKey }
  },

  async list(accountId: bigint) {
    return apikeyRepository.listByAccount(accountId)
  },

  async revoke(id: bigint) {
    await apikeyRepository.revoke(id)
  },
}

export function generateApiKey(): string {
  return generateApiKeyString()
}
