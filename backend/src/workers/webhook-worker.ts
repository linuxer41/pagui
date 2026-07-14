import { processPendingJobs } from '../payments/webhooks/webhook.service'
import { logger } from '../shared/logger'
import { testConnection } from '../shared/database/pool'

async function main() {
  await testConnection()
  logger.info('Webhook worker started')

  const INTERVAL_MS = 10_000

  const run = async () => {
    try {
      await processPendingJobs()
    } catch (err) {
      logger.error('Webhook worker error', { error: String(err) })
    }
  }

  await run()
  setInterval(run, INTERVAL_MS)

  process.on('SIGINT', () => process.exit(0))
  process.on('SIGTERM', () => process.exit(0))
}

main()
