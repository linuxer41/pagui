import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { createBackup, verifyBackup, getBackupStatus } from './wallet-backup.service'

export const walletBackupRoutes = new Elysia({ prefix: '/wallet' })
  .derive(authMiddleware)
  .post('/:walletId/backup', async ({ params, userId }) => {
    return await createBackup(params.walletId, userId)
  }, {
    params: t.Object({ walletId: t.String() }),
    detail: { tags: ['Wallet'], summary: 'Crear respaldo de wallet (seed phrase)' },
  })
  .post('/:walletId/backup/verify', async ({ params, userId }) => {
    await verifyBackup(params.walletId, userId)
    return { success: true }
  }, {
    params: t.Object({ walletId: t.String() }),
    detail: { tags: ['Wallet'], summary: 'Verificar respaldo de wallet' },
  })
  .get('/:walletId/backup', async ({ params }) => {
    return await getBackupStatus(params.walletId)
  }, {
    params: t.Object({ walletId: t.String() }),
    detail: { tags: ['Wallet'], summary: 'Estado del respaldo' },
  })
