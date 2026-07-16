import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { createBackup, verifyBackup, getBackupStatus } from './wallet-backup.service'
import { ok } from '../../shared/response'

export const walletBackupRoutes = new Elysia({ prefix: '/wallet' })
  .derive(authMiddleware)
  .post('/:walletId/backup', async ({ params, userId }) => {
    return ok(await createBackup(params.walletId, userId))
  }, {
    params: t.Object({ walletId: t.String() }),
    detail: { tags: ['Wallet'], summary: 'Crear respaldo de wallet (seed phrase)' },
  })
  .post('/:walletId/backup/verify', async ({ params, userId }) => {
    await verifyBackup(params.walletId, userId)
    return ok(null)
  }, {
    params: t.Object({ walletId: t.String() }),
    detail: { tags: ['Wallet'], summary: 'Verificar respaldo de wallet' },
  })
  .get('/:walletId/backup', async ({ params }) => {
    return ok(await getBackupStatus(params.walletId))
  }, {
    params: t.Object({ walletId: t.String() }),
    detail: { tags: ['Wallet'], summary: 'Estado del respaldo' },
  })
