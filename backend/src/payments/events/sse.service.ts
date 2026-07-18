import { eventBus } from './event-bus'

interface SSEClient {
  id: string
  userId: bigint
  send: (data: string) => void
  close: () => void
}

const clients = new Map<string, SSEClient>()

function broadcast(type: string, data: any) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(c => c.send(msg))
}

function broadcastToUser(userId: bigint, type: string, data: any) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(c => {
    if (c.userId === userId) c.send(msg)
  })
}

export const sseService = {
  addClient(id: string, userId: bigint, send: (data: string) => void, close: () => void) {
    clients.set(id, { id, userId, send, close })
    send(`event: connection\ndata: ${JSON.stringify({ connectionId: id })}\n\n`)
  },

  removeClient(id: string) {
    clients.delete(id)
  },

  sendToUser(userId: bigint, event: string, data: any) {
    broadcastToUser(userId, event, data)
  },

  sendToAll(event: string, data: any) {
    broadcast(event, data)
  },

  getStats() {
    const uniqueUsers = new Set<bigint>()
    clients.forEach(c => uniqueUsers.add(c.userId))
    return { connectedClients: clients.size, uniqueUsers: uniqueUsers.size }
  },

  closeAll() {
    clients.forEach(c => c.close())
    clients.clear()
  },
}

eventBus.on('qr.paid', (data) => broadcast('qr_payment', data))
eventBus.on('qr.created', (data) => broadcast('qr_created', data))
eventBus.on('qr.cancelled', (data) => broadcast('qr_cancelled', data))
eventBus.on('transfer.completed', (data) => broadcast('transfer_completed', data))
eventBus.on('notification.created', (data) => {
  broadcastToUser(data.userId, 'notification', {
    id: String(data.id),
    type: data.type,
    title: data.title,
    message: data.body,
    data: data.data,
    timestamp: data.createdAt,
    read: data.isRead,
  })
})
