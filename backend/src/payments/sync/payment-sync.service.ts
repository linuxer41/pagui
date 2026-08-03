import { query } from '../../shared/database/pool'
import { walletRepository } from '../../banking/wallet/wallet.repository'
import { qrRepository } from '../qr/qr.repository'
import { BanecoAdapter } from '../../banking/integration/baneco.adapter'
import { resolveCredentials } from '../../banking/credential/credential-resolver'
import { logger } from '../../shared/logger'
import { eventBus } from '../events/event-bus'
import { notifService } from '../notification/notif.service'

export const paymentSyncService = {
  async syncQRStatus(qrId: string): Promise<{ changed: boolean; status?: string }> {
    const qr = await qrRepository.getByQrId(qrId)
    if (!qr || qr.status === 'used' || qr.status === 'cancelled') return { changed: false }

    const cred = await resolveCredentials(qr.banecoCredentialId)

    try {
      const adapter = new BanecoAdapter(cred.api_base_url, cred.encryption_key)
      const token = await adapter.getToken(cred.username, cred.password)
      const status = await adapter.getQrStatus(token, qrId)

      if (status.status === 'PAID' || status.status === 'COMPLETED') {
        // Claim atómico: solo el proceso que logre pasar el QR a 'used' crea el
        // movimiento. Evita duplicados si corren varios workers/instancias.
        const claim = await query(
          `UPDATE qr_codes SET status = 'used', updated_at = CURRENT_TIMESTAMP
           WHERE qr_id = $1 AND status = 'active'`,
          [qrId]
        )
        if (claim.rowCount === 0) {
          await query(`
            INSERT INTO payment_sync_status (qr_id, last_checked, check_count, success, final_status)
            VALUES ($1, CURRENT_TIMESTAMP, 1, true, 'completed')
            ON CONFLICT (qr_id) DO UPDATE SET
              last_checked = CURRENT_TIMESTAMP, check_count = payment_sync_status.check_count + 1,
              success = true, final_status = 'completed'
          `, [qrId])
          return { changed: false, status: 'completed' }
        }
        const movement = await walletRepository.createMovement({
          walletId: qr.walletId, movementType: 'qr_payment',
          amount: status.amount, balanceBefore: 0, balanceAfter: 0,
          description: status.description || `Pago QR ${qrId}`, qrId, transactionId: qr.transactionId,
          paymentDate: status.paymentDate || new Date().toISOString(), currency: status.currency,
          senderName: status.senderName || null,
          senderDocumentId: status.senderDocumentId || null,
          senderAccount: status.senderAccount || null,
          senderBankCode: status.senderBankCode || null,
          referenceId: qr.transactionId, referenceType: 'qr',
        })
        await query(`
          INSERT INTO payment_sync_status (qr_id, last_checked, check_count, success, final_status)
          VALUES ($1, CURRENT_TIMESTAMP, 1, true, 'completed')
          ON CONFLICT (qr_id) DO UPDATE SET
            last_checked = CURRENT_TIMESTAMP, check_count = payment_sync_status.check_count + 1,
            success = true, final_status = 'completed'
        `, [qrId])
        eventBus.emit('qr.paid', { qrId, walletId: qr.walletId, amount: status.amount, movementId: movement.id })

        notifService.getWalletUserIds(qr.walletId).then(userIds =>
          Promise.all(userIds.map(uid =>
            notifService.qrPaymentReceived(uid, status.amount, qr.description || 'Pago QR', qrId)
          ))
        ).catch(e => logger.error('Failed to notify QR payment to wallet users', { error: e.message, qrId }))

        return { changed: true, status: 'completed' }
      }

      if (status.status === 'EXPIRED' || status.status === 'CANCELLED') {
        await qrRepository.updateStatus(qrId, status.status.toLowerCase())
        await query(`
          INSERT INTO payment_sync_status (qr_id, last_checked, check_count, success, final_status)
          VALUES ($1, CURRENT_TIMESTAMP, 1, true, $2)
          ON CONFLICT (qr_id) DO UPDATE SET
            last_checked = CURRENT_TIMESTAMP, check_count = payment_sync_status.check_count + 1,
            success = true, final_status = $2
        `, [qrId, status.status.toLowerCase()])
        return { changed: true, status: status.status.toLowerCase() }
      }

      await query(`
        INSERT INTO payment_sync_status (qr_id, last_checked, check_count, success)
        VALUES ($1, CURRENT_TIMESTAMP, 1, true)
        ON CONFLICT (qr_id) DO UPDATE SET
          last_checked = CURRENT_TIMESTAMP, check_count = payment_sync_status.check_count + 1, success = true
      `, [qrId])
      return { changed: false }
    } catch (e) {
      logger.error('Sync error for QR', { qrId, error: String(e) })
      await query(`
        INSERT INTO payment_sync_status (qr_id, last_checked, success)
        VALUES ($1, CURRENT_TIMESTAMP, false)
        ON CONFLICT (qr_id) DO UPDATE SET last_checked = CURRENT_TIMESTAMP, success = false
      `, [qrId])
      return { changed: false }
    }
  },
}
