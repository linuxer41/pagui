import { Elysia, t } from 'elysia'
import { tenantService } from './tenant.service'

import { ok, list } from '../../shared/response'
import { AppError } from '../../shared/errors/app-error'

export const tenantRoutes = new Elysia({ prefix: '/tenants' })

  .get('/', async ({ auth }: any) => {
    const tenants = await tenantService.listByUser(auth.user.id)
    return list(tenants, undefined, 'Clientes listados exitosamente')
  }, {
    detail: { tags: ['Tenants'], summary: 'Listar mis clientes' },
  })

  .get('/:id', async ({ params, auth }: any) => {
    const tenant = await tenantService.getById(BigInt(params.id))
    if (!tenant) throw new AppError(404, 'Cliente no encontrado')
    return ok(tenant)
  }, {
    detail: { tags: ['Tenants'], summary: 'Obtener cliente por ID' },
  })

  .post('/', async ({ body, auth }: any) => {
    const tenant = await tenantService.create({ ...body, ownerUserId: auth.user.id })
    return ok(tenant, 'Cliente creado exitosamente')
  }, {
    body: t.Object({
      fullName: t.String({ minLength: 2 }),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      documentType: t.Optional(t.String()),
      documentNumber: t.Optional(t.String()),
      dateOfBirth: t.Optional(t.String()),
      nationality: t.Optional(t.String()),
      address: t.Optional(t.String()),
    }),
    detail: { tags: ['Tenants'], summary: 'Crear cliente' },
  })

  .put('/:id', async ({ params, body, auth }: any) => {
    return ok(await tenantService.update(BigInt(params.id), body))
  }, {
    body: t.Object({
      fullName: t.Optional(t.String()),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      documentType: t.Optional(t.String()),
      documentNumber: t.Optional(t.String()),
      dateOfBirth: t.Optional(t.String()),
      nationality: t.Optional(t.String()),
      address: t.Optional(t.String()),
      photoUrl: t.Optional(t.String()),
    }),
    detail: { tags: ['Tenants'], summary: 'Actualizar cliente' },
  })
