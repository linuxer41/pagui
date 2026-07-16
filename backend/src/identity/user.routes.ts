import { Elysia, t } from 'elysia'
import { userService } from './user.service'
import { userProfileRepository } from './user-profile.repository'
import { deviceRepository } from './device.repository'
import { authMiddleware } from '../shared/middleware/auth.middleware'
import { AppError } from '../shared/errors/app-error'
import { ok, list } from '../shared/response'

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))

  .get('/', async ({ query }) => {
    const result = await userService.list({
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      search: query.search,
      status: query.status,
    })
    return list(result.users, result.totalCount, 'Usuarios listados exitosamente')
  }, {
    query: t.Optional(t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      search: t.Optional(t.String()),
      status: t.Optional(t.String()),
    })),
    detail: { tags: ['Users'], summary: 'Listar usuarios' },
  })

  .get('/me', async ({ auth }: any) => {
    return ok(await userService.getById(auth.user.id))
  }, {
    detail: { tags: ['Users'], summary: 'Obtener mi perfil' },
  })

  .put('/me', async ({ body, auth }: any) => {
    return ok(await userService.update(auth.user.id, body))
  }, {
    body: t.Object({
      fullName: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
    }),
    detail: { tags: ['Users'], summary: 'Actualizar mi perfil' },
  })

  .get('/:id', async ({ params }) => {
    const user = await userService.getById(BigInt(params.id))
    if (!user) throw new AppError(404, 'Usuario no encontrado')
    return ok(user)
  }, {
    detail: { tags: ['Users'], summary: 'Obtener usuario por ID' },
  })

  .get('/me/profile', async ({ auth }: any) => {
    const profile = await userProfileRepository.getByUserId(auth.user.id)
    return ok(profile || {})
  }, {
    detail: { tags: ['Users'], summary: 'Obtener perfil extendido' },
  })

  .put('/me/profile', async ({ body, auth }: any) => {
    await userProfileRepository.upsert(auth.user.id, body)
    return ok(null, 'Perfil actualizado')
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
    detail: { tags: ['Users'], summary: 'Actualizar perfil extendido' },
  })

  .get('/me/devices', async ({ auth }: any) => {
    const devices = await deviceRepository.listByUser(auth.user.id)
    return list(devices, undefined, 'Dispositivos listados exitosamente')
  }, {
    detail: { tags: ['Users'], summary: 'Listar dispositivos' },
  })

  .post('/me/devices', async ({ body, auth }: any) => {
    return ok(await deviceRepository.register({ ...body, userId: auth.user.id }))
  }, {
    body: t.Object({
      deviceName: t.Optional(t.String()),
      deviceType: t.Optional(t.String()),
      deviceId: t.String(),
      fcmToken: t.Optional(t.String()),
      apnsToken: t.Optional(t.String()),
    }),
    detail: { tags: ['Users'], summary: 'Registrar dispositivo' },
  })
