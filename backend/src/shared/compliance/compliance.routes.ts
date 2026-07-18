import { Elysia } from 'elysia'
import { checkPCICompliance, logComplianceCheck } from './pci.service'
import { applyRetentionPolicies, getRetentionStatus } from './retention.service'
import { logAudit } from '../audit/audit.service'
import { ok } from '../response'

export const complianceRoutes = new Elysia({ prefix: '/compliance' })
  .get('/pci', async () => {
    return ok(await logComplianceCheck())
  }, {
    detail: { tags: ['Compliance'], summary: 'Verificar compliance PCI-DSS' },
  })
  .post('/retention/run', async () => {
    await logAudit({ action: 'compliance.check', details: { type: 'retention_run' } })
    return ok(await applyRetentionPolicies(false))
  }, {
    detail: { tags: ['Compliance'], summary: 'Ejecutar limpieza por retención' },
  })
  .get('/retention/dry-run', async () => {
    return ok(await applyRetentionPolicies(true))
  }, {
    detail: { tags: ['Compliance'], summary: 'Simular limpieza (sin borrar)' },
  })
  .get('/retention/status', async () => {
    return ok(await getRetentionStatus())
  }, {
    detail: { tags: ['Compliance'], summary: 'Estado de retención por tabla' },
  })
