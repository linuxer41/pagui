import { Elysia } from 'elysia'
import { authMiddleware } from '../middleware/auth.middleware'
import { checkPCICompliance, logComplianceCheck } from './pci.service'
import { applyRetentionPolicies, getRetentionStatus } from './retention.service'
import { logAudit } from '../audit/audit.service'

export const complianceRoutes = new Elysia({ prefix: '/compliance' })
  .derive(authMiddleware)
  .get('/pci', async () => {
    return await logComplianceCheck()
  }, {
    detail: { tags: ['Compliance'], summary: 'Verificar compliance PCI-DSS' },
  })
  .post('/retention/run', async () => {
    await logAudit({ action: 'compliance.check', details: { type: 'retention_run' } })
    return await applyRetentionPolicies(false)
  }, {
    detail: { tags: ['Compliance'], summary: 'Ejecutar limpieza por retención' },
  })
  .get('/retention/dry-run', async () => {
    return await applyRetentionPolicies(true)
  }, {
    detail: { tags: ['Compliance'], summary: 'Simular limpieza (sin borrar)' },
  })
  .get('/retention/status', async () => {
    return await getRetentionStatus()
  }, {
    detail: { tags: ['Compliance'], summary: 'Estado de retención por tabla' },
  })
