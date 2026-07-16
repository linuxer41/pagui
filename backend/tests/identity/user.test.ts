import { describe, expect, test, beforeAll } from 'bun:test'
import { nextSnowflake } from '../../src/shared/snowflake'

describe('User service', () => {
  const testUserId = nextSnowflake()
  const testEmail = `user-test-${testUserId}@test.com`

  beforeAll(async () => {
    const { query } = await import('../../src/shared/database/pool')
    await query(
      `INSERT INTO users (id, email, password, full_name, role, status)
       VALUES ($1, $2, 'hash', 'User Tester', 3, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, testEmail]
    )
  })

  test('getById returns existing user', async () => {
    const { userService } = await import('../../src/identity/user.service')
    const user = await userService.getById(testUserId)
    expect(user).toBeDefined()
    expect(user!.email).toBe(testEmail)
    expect(user!.fullName).toBe('User Tester')
  })

  test('getById returns null for non-existent user', async () => {
    const { userService } = await import('../../src/identity/user.service')
    const result = await userService.getById(nextSnowflake())
    expect(result).toBeNull()
  })

  test('list returns paginated users', async () => {
    const { userService } = await import('../../src/identity/user.service')
    const result = await userService.list({ page: 1, limit: 10 })
    expect(result.users.length).toBeGreaterThanOrEqual(1)
    expect(result.totalCount).toBeGreaterThanOrEqual(1)
    expect(result.pagination.page).toBe(1)
  })

  test('list supports search filter', async () => {
    const { userService } = await import('../../src/identity/user.service')
    const result = await userService.list({ search: 'User Tester' })
    expect(result.users.length).toBeGreaterThanOrEqual(1)
    expect(result.users.some((u: any) => u.email === testEmail)).toBe(true)
  })

  test('update modifies user fields', async () => {
    const { userService } = await import('../../src/identity/user.service')
    const updated = await userService.update(testUserId, { phone: '77777777' })
    expect(updated).toBeDefined()
    expect(updated!.phone).toBe('77777777')
  })

  test('create inserts and returns a new user', async () => {
    const { userService } = await import('../../src/identity/user.service')
    const newId = nextSnowflake()
    const email = `new-user-${newId}@test.com`
    const user = await userService.create({
      id: newId, email, password: 'test123',
      fullName: 'New User', role: 3,
    })
    expect(user).toBeDefined()
    expect(user.email).toBe(email)
  })
})
