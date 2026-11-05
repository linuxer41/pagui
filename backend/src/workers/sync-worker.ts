import { paymentQueueService } from '../payments/sync/payment-queue.service'
// Se importa por el efecto: registra la escucha de 'qr.paid' en este proceso, asi el pago
// que detecta el sondeo (y no la notificacion del banco) tambien encola su webhook.
import '../payments/webhooks/webhook.service'
import { logger } from '../shared/logger'
import { testConnection } from '../shared/database/pool'

async function main() {
  await testConnection()
  logger.info('Sync worker started')

  await paymentQueueService.startAll()
  const sweeper = paymentQueueService.startSweeper()

  process.on('SIGINT', () => {
    logger.info('Sync worker shutting down...')
    clearInterval(sweeper)
    paymentQueueService.stopAll()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logger.info('Sync worker shutting down...')
    clearInterval(sweeper)
    paymentQueueService.stopAll()
    process.exit(0)
  })
}

main()
