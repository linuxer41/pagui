import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../shared/middleware/auth.middleware'
import { registerDeviceToken, sendPush } from './push.service'
import { ok } from '../../shared/response'

export const pushRoutes = new Elysia({ prefix: '/push' })
  .derive(authMiddleware)
  .post('/register', async ({ userId, body }) => {
    await registerDeviceToken(userId, body.token, body.platform)
    return ok(null)
  }, {
    body: t.Object({
      token: t.String(),
      platform: t.Enum({ ios: 'ios', android: 'android' }),
    }),
    detail: { tags: ['Push'], summary: 'Registrar token de push notification' },
  })
  .post('/test', async ({ userId, body }) => {
    const sent = await sendPush(userId, body)
    return ok({ sent })
  }, {
    body: t.Object({
      title: t.String(),
      body: t.String(),
      data: t.Optional(t.Record(t.String(), t.String())),
    }),
    detail: { tags: ['Push'], summary: 'Enviar push de prueba' },
  })
