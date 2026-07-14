type CacheValue = string | number | boolean | object | null

interface CacheEntry {
  value: CacheValue
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry>()
  private periodicCleanup: ReturnType<typeof setInterval>

  constructor() {
    this.periodicCleanup = setInterval(() => this.cleanup(), 60_000)
  }

  get<T = CacheValue>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  set(key: string, value: CacheValue, ttlMs: number = 300_000): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  del(key: string): void {
    this.store.delete(key)
  }

  delPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }

  destroy(): void {
    clearInterval(this.periodicCleanup)
    this.store.clear()
  }
}

export const cache = new MemoryCache()
