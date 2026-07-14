import { query } from '../../shared/database/pool'
import { accountRepository } from '../../banking/account/account.repository'
import { qrRepository } from '../qr/qr.repository'
import { bankCredentialRepository } from '../../banking/credential/bank-credential.repository'
import { BanecoAdapter } from '../../banking/integration/baneco.adapter'
import { eventBus } from '../events/event-bus'
import { nextSnowflake } from '../../shared/snowflake'

export const paymentSyncService = {
  async syncQRStatus(qrId: string): Promise<{ changed: boolean; status?: string }> {
    const qr = await qrRepository.getByQrId(qrId)
    if (!qr || qr.status === 'used' || qr.status === 'cancelled') return { changed: false }

    const cred = qr.bankCredentialId
      ? await bankCredentialRepository.getById(qr.bankCredentialId)
      : null
    if (!cred) return { changed: false }

    try {
      const adapter = new BanecoAdapter(cred.apiBaseUrl, cred.encryptionKey)
      const token = await adapter.getToken(cred.username, cred.password)
      const status = await adapter.getQrStatus(token, qrId)

      if (status.status === 'PAID' || status.status === 'COMPLETED') {
        const movement = await accountRepository.createMovement({
          accountId: qr.accountId, movementType: 'qr_payment',
          amount: status.amount, balanceBefore: 0, balanceAfter: 0,
          description: `Pago QR ${qrId}`, qrId, transactionId: qr.transactionId,
          paymentDate: new Date().toISOString(), currency: status.currency,
          referenceId: qr.transactionId, referenceType: 'qr',
        })
        await qrRepository.updateStatus(qrId, 'used')
        await query(`
          INSERT INTO payment_sync_status (qr_id, last_checked, check_count, success, final_status)
          VALUES ($1, CURRENT_TIMESTAMP, 1, true, 'completed')
          ON CONFLICT (qr_id) DO UPDATE SET
            last_checked = CURRENT_TIMESTAMP, check_count = payment_sync_status.check_count + 1,
            success = true, final_status = 'completed'
        `, [qrId])
        eventBus.emit('qr.paid', { qrId, accountId: qr.accountId, amount: status.amount, movementId: movement.id })
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
      console.error(`Sync error for QR ${qrId}:`, e)
      await query(`
        INSERT INTO payment_sync_status (qr_id, last_checked, success)
        VALUES ($1, CURRENT_TIMESTAMP, false)
        ON CONFLICT (qr_id) DO UPDATE SET last_checked = CURRENT_TIMESTAMP, success = false
      `, [qrId])
      return { changed: false }
    }
  },
}
