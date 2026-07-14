import { describe, expect, test } from 'bun:test'
import { nextSnowflake } from '../../src/shared/snowflake'

describe('Snowflake ID generation', () => {
  test('generates unique IDs', () => {
    const ids = new Set<bigint>()
    for (let i = 0; i < 1000; i++) {
      ids.add(nextSnowflake())
    }
    expect(ids.size).toBe(1000)
  })

  test('IDs are monotonically increasing', () => {
    const a = nextSnowflake()
    const b = nextSnowflake()
    const c = nextSnowflake()
    expect(a < b).toBe(true)
    expect(b < c).toBe(true)
  })

  test('IDs are positive bigints', () => {
    const id = nextSnowflake()
    expect(id > 0).toBe(true)
    expect(typeof id).toBe('bigint')
  })
})
