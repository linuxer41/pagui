import { paymentSyncService } from './payment-sync.service'
import { qrRepository } from '../qr/qr.repository'
import { logger } from '../../shared/logger'

const syncQueues = new Map<string, { timer: ReturnType<typeof setTimeout>; attempts: number }>()
const MAX_ATTEMPTS = 20
const SWEEPER_INTERVAL = 5 * 60 * 1000

function getInterval(attempts: number): number {
  if (attempts <= 3) return 30 * 1000
  if (attempts <= 8) return 2 * 60 * 1000
  if (attempts <= 12) return 5 * 60 * 1000
  return 15 * 60 * 1000
}

export const paymentQueueService = {
  enqueueSync(qrId: string) {
    if (syncQueues.has(qrId)) return
    this.scheduleNext(qrId, 0)
  },

  scheduleNext(qrId: string, attempts: number) {
    const existing = syncQueues.get(qrId)
    if (existing) clearTimeout(existing.timer)

    const interval = getInterval(attempts)
    const timer = setTimeout(async () => {
      const { changed } = await paymentSyncService.syncQRStatus(qrId)
      const nextAttempts = attempts + 1
      if (!changed && nextAttempts < MAX_ATTEMPTS) {
        this.scheduleNext(qrId, nextAttempts)
      } else {
        syncQueues.delete(qrId)
      }
    }, interval)

    syncQueues.set(qrId, { timer, attempts })
  },

  // Re-encola todos los QRs activos desde la BD. Se invoca al arrancar
  // para sobrevivir a reinicios (los timers en memoria se pierden).
  async startAll() {
    try {
      const qrIds = await qrRepository.listActive()
      for (const qrId of qrIds) {
        this.enqueueSync(qrId)
      }
      logger.info(`Sync worker: ${qrIds.length} QR(s) activo(s) re-encolado(s)`)
    } catch (e) {
      logger.error('Sync worker: error re-encolando QRs activos', { error: String(e) })
    }
  },

  // Sweeper periódico: rescata cualquier QR activo que haya quedado fuera
  // de la cola (e.g. tras un reinicio, o si un intento llegó a MAX_ATTEMPTS).
  startSweeper() {
    return setInterval(async () => {
      try {
        const qrIds = await qrRepository.listActive()
        for (const qrId of qrIds) {
          if (!syncQueues.has(qrId)) this.enqueueSync(qrId)
        }
      } catch (e) {
        logger.error('Sync sweeper error', { error: String(e) })
      }
    }, SWEEPER_INTERVAL)
  },

  stopAll() {
    for (const [qrId, { timer }] of syncQueues) {
      clearTimeout(timer)
    }
    syncQueues.clear()
  },
}
