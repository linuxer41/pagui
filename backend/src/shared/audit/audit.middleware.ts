import { Elysia } from 'elysia'
import { logAudit, type AuditAction } from './audit.service'

export function auditMiddleware(action: AuditAction) {
  return new Elysia({ name: 'audit' })
    .onAfterHandle({ as: 'global' }, async (ctx) => {
      const auth = (ctx as any).auth
      const userId = auth?.user?.id || auth?.apiKeyInfo?.walletId
      await logAudit({
        userId,
        action,
        resourceType: ctx.path.split('/')[1],
        resourceId: ctx.params?.id,
        ip: ctx.headers['x-forwarded-for'] as string,
        userAgent: ctx.headers['user-agent'] as string,
        details: { method: ctx.request.method, path: ctx.path, status: ctx.set.status },
      })
    })
}
