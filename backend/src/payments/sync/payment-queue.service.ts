import { paymentSyncService } from './payment-sync.service'

const syncQueues = new Map<string, { timer: ReturnType<typeof setTimeout>; attempts: number }>()
const MAX_ATTEMPTS = 20

function getInterval(attempts: number): number {
  if (attempts <= 5) return 2 * 60 * 1000
  if (attempts <= 10) return 5 * 60 * 1000
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

  stopAll() {
    for (const [qrId, { timer }] of syncQueues) {
      clearTimeout(timer)
    }
    syncQueues.clear()
  },
}
