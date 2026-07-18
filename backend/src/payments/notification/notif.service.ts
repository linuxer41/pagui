import { notifRepository } from './notif.repository'
import { eventBus } from '../events/event-bus'
import { sendPush } from '../push/push.service'
import { walletPermissionRepository } from '../../identity/wallet-permission/wallet-permission.repository'

export const notifService = {
  async create(userId: bigint, type: string, title: string, body?: string, data?: Record<string, unknown>) {
    const notification = await notifRepository.create({
      userId, type, title, body, data,
    })
    eventBus.emit('notification.created', notification)
    sendPush(userId, { title, body: body || title }).catch(() => {})
    return notification
  },

  async creditReceived(userId: bigint, amount: number, description: string) {
    return this.create(userId, 'balance', 'Saldo acreditado',
      `Has recibido un abono de BOB ${amount.toFixed(2)} por: ${description}`,
      { amount, description, type: 'credit' })
  },

  async transferSent(userId: bigint, amount: number, receiverName: string, transferId: bigint) {
    return this.create(userId, 'payment', 'Transferencia enviada',
      `Has enviado BOB ${amount.toFixed(2)} a ${receiverName}`,
      { amount, receiverName, transferId: String(transferId), type: 'transfer_sent' })
  },

  async transferReceived(userId: bigint, amount: number, senderName: string, transferId: bigint) {
    return this.create(userId, 'payment', 'Transferencia recibida',
      `Has recibido BOB ${amount.toFixed(2)} de ${senderName}`,
      { amount, senderName, transferId: String(transferId), type: 'transfer_received' })
  },

  async qrPaymentReceived(userId: bigint, amount: number, description: string, qrId: string, senderName?: string) {
    return this.create(userId, 'payment', 'Pago QR recibido',
      senderName
        ? `Recibiste BOB ${amount.toFixed(2)} de ${senderName}${description ? ` — ${description}` : ''}`
        : `Has recibido BOB ${amount.toFixed(2)}${description ? ` por: ${description}` : ''}`,
      { amount, description, qrId, senderName, type: 'qr_payment' })
  },

  async getWalletUserIds(walletId: bigint): Promise<bigint[]> {
    const permissions = await walletPermissionRepository.listByWallet(walletId)
    return permissions.map(p => p.userId)
  },
}
