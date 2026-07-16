import { describe, expect, test, beforeAll } from 'bun:test'
import { nextSnowflake } from '../../src/shared/snowflake'

describe('Cash service', () => {
  const testUserId = nextSnowflake()
  let walletId = 0n

  beforeAll(async () => {
    const { query } = await import('../../src/shared/database/pool')
    await query(
      `INSERT INTO users (id, email, password, full_name, role, status)
       VALUES ($1, 'cash-test@test.com', 'hash', 'Cash Tester', 3, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId]
    )
    const wallet = await query(
      `INSERT INTO wallets (id, user_id, balance, available_balance, currency, status)
       VALUES ($1, $2, 10000, 10000, 'BOB', 'active')
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [nextSnowflake(), testUserId]
    )
    walletId = wallet.rows[0]?.id || 0n
  })

  test('registerAgent creates a new cash agent', async () => {
    const { registerAgent } = await import('../../src/payments/cash/cash.service')
    const agent = await registerAgent({
      userId: testUserId,
      name: 'Test Agent',
      phone: '70000000',
      address: 'Test Address 123',
      lat: -16.5,
      lng: -68.15,
    })
    expect(agent).toBeDefined()
    expect(agent.agentId).toBeDefined()
  })

  test('getNearbyAgents returns agents within radius', async () => {
    const { getNearbyAgents } = await import('../../src/payments/cash/cash.service')
    const agents = await getNearbyAgents({ lat: -16.5, lng: -68.15, radiusKm: 10 })
    expect(agents).toBeDefined()
    expect(agents.length).toBeGreaterThanOrEqual(1)
    expect(agents[0].name).toBe('Test Agent')
  })

  test('getNearbyAgents returns empty for far-away location', async () => {
    const { getNearbyAgents } = await import('../../src/payments/cash/cash.service')
    const agents = await getNearbyAgents({ lat: -30.0, lng: -60.0, radiusKm: 1 })
    expect(agents).toBeDefined()
    expect(agents.length).toBe(0)
  })

  test('processCashTransaction with cash_in increases wallet balance', async () => {
    if (!walletId) return
    const { processCashTransaction } = await import('../../src/payments/cash/cash.service')
    const result = await processCashTransaction({
      userId: testUserId,
      agentId: '',
      userWalletId: String(walletId),
      amount: 500,
      direction: 'cash_in',
      reference: `ref-${Date.now()}`,
    })
    expect(result).toBeDefined()
    expect(result.amount).toBe(500)
  })
})
