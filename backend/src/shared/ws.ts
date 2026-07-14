import { Elysia } from 'elysia'
import { logger } from './logger'
import { verifyToken } from './middleware/auth.middleware'
import crypto from 'node:crypto'

interface WSClient {
  ws: any
  userId: string
  subscriptions: Set<string>
  connectedAt: number
}

const clients = new Map<string, WSClient>()

export const wsRoutes = new Elysia()
  .ws('/ws', {
    async open(ws) {
      const url = new URL(ws.data?.url || 'ws://localhost/ws')
      const token = url.searchParams.get('token')
      const userId = url.searchParams.get('userId')

      if (!token || !userId) {
        ws.close(4001, 'Authentication required')
        return
      }

      try {
        const payload = await verifyToken(token)
        if (String(payload.userId) !== userId) {
          ws.close(4003, 'Invalid token')
          return
        }
      } catch {
        ws.close(4002, 'Invalid token')
        return
      }

      const clientId = crypto.randomUUID()
      clients.set(clientId, {
        ws,
        userId,
        subscriptions: new Set(),
        connectedAt: Date.now(),
      })

      ws.data = { clientId }

      ws.send(JSON.stringify({ type: 'connected', clientId }))
      logger.info('WS client connected', { userId, clientId })
    },

    message(ws, raw: string) {
      try {
        const msg = JSON.parse(raw)
        const client = clients.get(ws.data?.clientId)
        if (!client) return

        switch (msg.type) {
          case 'subscribe': {
            if (msg.channel) {
              client.subscriptions.add(msg.channel)
              ws.send(JSON.stringify({ type: 'subscribed', channel: msg.channel }))
            }
            break
          }
          case 'unsubscribe': {
            if (msg.channel) {
              client.subscriptions.delete(msg.channel)
              ws.send(JSON.stringify({ type: 'unsubscribed', channel: msg.channel }))
            }
            break
          }
          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }))
            break
          }
          default: {
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
          }
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      }
    },

    close(ws) {
      const clientId = ws.data?.clientId
      if (clientId) {
        const client = clients.get(clientId)
        logger.info('WS client disconnected', { userId: client?.userId, clientId })
        clients.delete(clientId)
      }
    },
  })

export function broadcast(channel: string, data: unknown) {
  const message = JSON.stringify({ type: 'event', channel, data })
  let count = 0
  for (const [, client] of clients) {
    if (client.subscriptions.has(channel) || channel === 'all') {
      try {
        client.ws.send(message)
        count++
      } catch {}
    }
  }
  return count
}

export function sendToUser(userId: string | bigint, data: unknown) {
  const userIdStr = String(userId)
  const message = JSON.stringify({ type: 'direct', data })
  let count = 0
  for (const [, client] of clients) {
    if (client.userId === userIdStr) {
      try {
        client.ws.send(message)
        count++
      } catch {}
    }
  }
  return count
}

export function getWSStats() {
  return {
    totalClients: clients.size,
    channels: new Set(
      Array.from(clients.values()).flatMap(c => Array.from(c.subscriptions))
    ).size,
  }
}
