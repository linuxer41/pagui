import { paymentQueueService } from '../payments/sync/payment-queue.service'
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
