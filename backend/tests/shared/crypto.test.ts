import { describe, expect, test } from 'bun:test'
import { encrypt, decrypt, hash, generateSeedPhrase } from '../../src/shared/crypto'

describe('Crypto utilities', () => {
  test('encrypt/decrypt roundtrip', () => {
    const original = 'mi-secreto-super-seguro-123'
    const encrypted = encrypt(original)
    expect(encrypted).not.toBe(original)
    expect(encrypted).toContain(':')
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(original)
  })

  test('hash produces consistent length', () => {
    const result = hash('test-value')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[a-f0-9]+$/)
  })

  test('hash is deterministic', () => {
    expect(hash('hello')).toBe(hash('hello'))
    expect(hash('hello')).not.toBe(hash('world'))
  })

  test('seed phrase has 12 words', () => {
    const phrase = generateSeedPhrase()
    expect(phrase).toHaveLength(12)
  })

  test('seed phrase words are from the dictionary', () => {
    const phrase = generateSeedPhrase()
    for (const word of phrase) {
      expect(word).toBeTruthy()
      expect(typeof word).toBe('string')
    }
  })

  test('seed phrases are random', () => {
    const p1 = generateSeedPhrase()
    const p2 = generateSeedPhrase()
    expect(p1.join(' ')).not.toBe(p2.join(' '))
  })
})
