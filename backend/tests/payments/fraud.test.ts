import { describe, expect, test, beforeAll } from 'bun:test'
import { evaluateFraud, resolveAlert, getOpenAlerts } from '../../src/payments/fraud/fraud.service'
import { nextSnowflake } from '../../src/shared/snowflake'

describe('Fraud detection', () => {
  const testWalletId = nextSnowflake()
  const testUserId = nextSnowflake()

  beforeAll(async () => {
    const { query } = await import('../../src/shared/database/pool')
    await query(
      `INSERT INTO wallets (id, user_id, balance, available_balance, currency, status)
       VALUES ($1, $2, 5000, 4800, 'BOB', 'active')
       ON CONFLICT (id) DO UPDATE SET balance = 5000, available_balance = 4800`,
      [testWalletId, testUserId]
    )
  })

  test('small transaction within limit is allowed', async () => {
    const result = await evaluateFraud({
      userId: testUserId,
      walletId: testWalletId,
      amount: 100,
    })
    expect(result.allowed).toBe(true)
    expect(result.score).toBeLessThan(60)
  })

  test('large transaction near balance limit triggers warning', async () => {
    const result = await evaluateFraud({
      userId: testUserId,
      walletId: testWalletId,
      amount: 4500,
    })
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  test('excessive amount blocked', async () => {
    const result = await evaluateFraud({
      userId: testUserId,
      walletId: testWalletId,
      amount: 99999,
    })
    expect(result.allowed).toBe(false)
    expect(result.score).toBeGreaterThanOrEqual(60)
  })
})
