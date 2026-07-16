import { Elysia } from 'elysia'
import { empsaatRoutes } from './providers/empsaat/empsaat.controller'
import { companyRepository } from './company/company.repository'
import { ok, list } from '../shared/response'
import { AppError } from '../shared/errors/app-error'

export const collectionsRoutes = new Elysia()
  .use(empsaatRoutes)

  .get('/companies', async () => {
    const companies = await companyRepository.listActive()
    return list(companies, undefined, 'Empresas listadas exitosamente')
  }, {
    detail: { tags: ['Collections'], summary: 'Listar empresas activas' },
  })

  .get('/companies/:slug', async ({ params }) => {
    const company = await companyRepository.getBySlug(params.slug)
    if (!company) throw new AppError(404, 'Empresa no encontrada')
    return ok(company)
  }, {
    detail: { tags: ['Collections'], summary: 'Obtener empresa por slug' },
  })
