import { createClient, type RedisClientType } from 'redis'
import { logger } from './logger'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let client: RedisClientType | null = null
let isConnected = false

export async function getRedis(): Promise<RedisClientType> {
  if (client && isConnected) return client

  client = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis max retries reached')
          return new Error('Redis max retries')
        }
        return Math.min(retries * 50, 2000)
      },
    },
  })

  client.on('connect', () => {
    isConnected = true
    logger.info('Redis connected')
  })

  client.on('error', (err) => {
    isConnected = false
    logger.error('Redis error', { error: err.message })
  })

  client.on('end', () => {
    isConnected = false
  })

  try {
    await client.connect()
  } catch (err) {
    logger.error('Redis connection failed, falling back to memory', { error: String(err) })
    return null as any
  }

  return client!
}

const memoryStore = new Map<string, { value: string; expiresAt: number }>()

export const redisCache = {
  async get<T = string>(key: string): Promise<T | null> {
    try {
      const r = await getRedis()
      if (r) {
        const val = await r.get(key)
        return val ? JSON.parse(val) as T : null
      }
    } catch {}

    const entry = memoryStore.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key)
      return null
    }
    return JSON.parse(entry.value) as T
  },

  async set(key: string, value: unknown, ttlMs = 300_000): Promise<void> {
    const serialized = JSON.stringify(value)
    try {
      const r = await getRedis()
      if (r) {
        await r.setEx(key, Math.ceil(ttlMs / 1000), serialized)
        return
      }
    } catch {}
    memoryStore.set(key, { value: serialized, expiresAt: Date.now() + ttlMs })
  },

  async del(key: string): Promise<void> {
    try {
      const r = await getRedis()
      if (r) { await r.del(key); return }
    } catch {}
    memoryStore.delete(key)
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const r = await getRedis()
      if (r) {
        const keys = await r.keys(pattern)
        if (keys.length > 0) await r.del(keys)
        return
      }
    } catch {}
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) memoryStore.delete(key)
    }
  },
}

export async function createSession(userId: bigint | string, ttlMs = 3_600_000): Promise<string> {
  const sessionId = crypto.randomUUID()
  const session = { userId: String(userId), createdAt: Date.now() }
  await redisCache.set(`session:${sessionId}`, session, ttlMs)
  return sessionId
}

export async function getSession(sessionId: string): Promise<{ userId: string; createdAt: number } | null> {
  return redisCache.get<{ userId: string; createdAt: number }>(`session:${sessionId}`)
}

export async function destroySession(sessionId: string): Promise<void> {
  await redisCache.del(`session:${sessionId}`)
}

export async function invalidateUserSessions(userId: bigint | string): Promise<void> {
  await redisCache.delPattern(`session:*`)
}
