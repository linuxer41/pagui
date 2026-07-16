import { eventBus } from './event-bus'

interface SSEClient {
  id: string
  send: (data: string) => void
  close: () => void
}

const clients = new Map<string, SSEClient>()

function broadcast(type: string, data: any) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(c => c.send(msg))
}

export const sseService = {
  addClient(id: string, send: (data: string) => void, close: () => void) {
    clients.set(id, { id, send, close })
    send(`event: connection\ndata: ${JSON.stringify({ connectionId: id })}\n\n`)
  },

  removeClient(id: string) {
    clients.delete(id)
  },

  sendToClient(id: string, event: string, data: any) {
    const client = clients.get(id)
    if (client) {
      client.send(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }
  },

  getStats() {
    return { connectedClients: clients.size }
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
