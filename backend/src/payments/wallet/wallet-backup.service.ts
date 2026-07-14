import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { encrypt, hash, generateSeedPhrase } from '../../shared/crypto'
import { logger } from '../../shared/logger'

export async function createBackup(walletId: bigint | string, userId: bigint | string) {
  const seedPhrase = generateSeedPhrase()
  const phraseStr = seedPhrase.join(' ')
  const encryptedSeedPhrase = encrypt(phraseStr)
  const seedPhraseHash = hash(phraseStr)

  await query(
    `INSERT INTO wallet_backups (id, wallet_id, user_id, seed_phrase_hash, encrypted_seed_phrase)
     VALUES ($1, $2, $3, $4, $5)`,
    [nextSnowflake(), walletId, userId, seedPhraseHash, encryptedSeedPhrase]
  )

  logger.info('Wallet backup created', { walletId, userId })
  return { seedPhrase }
}

export async function verifyBackup(walletId: bigint | string, userId: bigint | string) {
  await query(
    `UPDATE wallet_backups SET verified = TRUE, verified_at = CURRENT_TIMESTAMP
     WHERE wallet_id = $1 AND user_id = $2`,
    [walletId, userId]
  )
}

export async function getBackupStatus(walletId: bigint | string) {
  const result = await query(
    'SELECT verified, created_at, verified_at FROM wallet_backups WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 1',
    [walletId]
  )
  return result.rows[0] || null
}
