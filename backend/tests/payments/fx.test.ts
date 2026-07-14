import { describe, expect, test } from 'bun:test'
import { convert } from '../../src/payments/fx/fx.service'

describe('FX conversion', () => {
  test('same currency returns identity rate', async () => {
    const result = await convert(100, 'BOB', 'BOB')
    expect(result).toEqual({ amount: 100, rate: 1 })
  })

  test('negative amount is not handled yet (will return null rate)', async () => {
    const result = await convert(-100, 'BOB', 'USD')
    expect(result).toBeNull()
  })

  test('zero amount same currency', async () => {
    const result = await convert(0, 'BOB', 'BOB')
    expect(result).toEqual({ amount: 0, rate: 1 })
  })
})
