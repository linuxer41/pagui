import { Elysia, t } from 'elysia'
import { userService } from './user.service'
import { userProfileRepository } from './user-profile.repository'
import { deviceRepository } from './device.repository'
import { authMiddleware } from '../shared/middleware/auth.middleware'

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .get('/', async ({ query }) => {
    return userService.list({
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      search: query.search,
      status: query.status,
    })
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      status: t.Optional(t.String()),
    })),
  })

  .get('/me', async ({ auth }: any) => {
    return userService.getById(auth.user.id)
  })

  .put('/me', async ({ body, auth }: any) => {
    return userService.update(auth.user.id, body)
  }, {
    body: t.Object({
      fullName: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
    }),
  })

  .get('/:id', async ({ params }) => {
    const user = await userService.getById(BigInt(params.id))
    if (!user) throw new Error('Usuario no encontrado')
    return user
  })

  .get('/me/profile', async ({ auth }: any) => {
    const profile = await userProfileRepository.getByUserId(auth.user.id)
    return profile || {}
  })

  .put('/me/profile', async ({ body, auth }: any) => {
    await userProfileRepository.upsert(auth.user.id, body)
    return { message: 'Perfil actualizado' }
  }, {
    body: t.Object({
      pinHash: t.Optional(t.String()),
      documentType: t.Optional(t.String()),
      documentNumber: t.Optional(t.String()),
      dateOfBirth: t.Optional(t.String()),
      nationality: t.Optional(t.String()),
      dailyLimit: t.Optional(t.Number()),
      monthlyLimit: t.Optional(t.Number()),
    }),
  })

  .get('/me/devices', async ({ auth }: any) => {
    return deviceRepository.listByUser(auth.user.id)
  })

  .post('/me/devices', async ({ body, auth }: any) => {
    return deviceRepository.register({ ...body, userId: auth.user.id })
  }, {
    body: t.Object({
      deviceName: t.Optional(t.String()),
      deviceType: t.Optional(t.String()),
      deviceId: t.String(),
      fcmToken: t.Optional(t.String()),
      apnsToken: t.Optional(t.String()),
    }),
  })
