import { describe, expect, test, beforeAll } from 'bun:test'
import { nextSnowflake } from '../../src/shared/snowflake'

describe('Account service', () => {
  const testUserId = nextSnowflake()
  const bankId = nextSnowflake()
  let credentialId = 0n

  beforeAll(async () => {
    const { query } = await import('../../src/shared/database/pool')
    await query(
      `INSERT INTO users (id, email, password, full_name, role, status)
       VALUES ($1, 'account-test@test.com', 'hash', 'Account Tester', 3, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId]
    )
    await query(
      `INSERT INTO banks (id, code, name) VALUES ($1, 'TEST', 'Test Bank')
       ON CONFLICT (code) DO NOTHING`,
      [bankId]
    )
    const cred = await query(
      `INSERT INTO bank_credentials (id, bank_id, account_number, account_name, merchant_id, username, password, encryption_key, environment, api_base_url)
       VALUES ($1, $2, '999999', 'Test Credential', 'M999', 'user', 'pass', 'key', 'test', 'https://test.api')
       RETURNING id`,
      [nextSnowflake(), bankId]
    )
    credentialId = cred.rows[0].id
  })

  test('creates an account and links to user', async () => {
    const { accountService } = await import('../../src/banking/account/account.service')
    const account = await accountService.create({
      accountType: 'current',
      bankCredentialId: credentialId,
      userId: testUserId,
    })
    expect(account).toBeDefined()
    expect(account.accountNumber).toBeString()
    expect(account.accountNumber.length).toBeGreaterThan(0)
    expect(account.currency).toBe('BOB')
    expect(account.status).toBe('active')
  })

  test('lists accounts by user', async () => {
    const { accountService } = await import('../../src/banking/account/account.service')
    const accounts = await accountService.listByUser(testUserId)
    expect(accounts.length).toBeGreaterThanOrEqual(1)
    expect(accounts[0].id).toBeDefined()
    expect(accounts[0].isPrimary).toBeDefined()
  })

  test('getById returns null for non-existent account', async () => {
    const { accountService } = await import('../../src/banking/account/account.service')
    const result = await accountService.getById(nextSnowflake())
    expect(result).toBeNull()
  })

  test('creates and retrieves a movement', async () => {
    const { accountRepository } = await import('../../src/banking/account/account.repository')
    const accounts = await accountRepository.listByUser(testUserId)
    expect(accounts.length).toBeGreaterThan(0)

    const acct = accounts[0]
    const movement = await accountRepository.createMovement({
      accountId: acct.id,
      movementType: 'deposit',
      amount: 500,
      balanceBefore: 0,
      balanceAfter: 500,
      description: 'Test deposit',
    })
    expect(movement).toBeDefined()
    expect(movement.movementType).toBe('deposit')
    expect(Number(movement.amount)).toBe(500)
  })

  test('getMovements returns paginated results', async () => {
    const { accountRepository } = await import('../../src/banking/account/account.repository')
    const accounts = await accountRepository.listByUser(testUserId)
    const result = await accountRepository.getMovements(accounts[0].id, { page: 1, limit: 10 })
    expect(result.movements).toBeDefined()
    expect(result.totalCount).toBeGreaterThanOrEqual(1)
  })

  test('getStats returns summary counts', async () => {
    const { accountRepository } = await import('../../src/banking/account/account.repository')
    const accounts = await accountRepository.listByUser(testUserId)
    const stats = await accountRepository.getStats(accounts[0].id)
    expect(stats).toBeDefined()
    expect(typeof stats.today).toBe('number')
    expect(typeof stats.week).toBe('number')
    expect(typeof stats.month).toBe('number')
  })
})
