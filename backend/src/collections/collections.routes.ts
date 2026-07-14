import { Elysia } from 'elysia'
import { empsaatRoutes } from './providers/empsaat/empsaat.controller'
import { companyRepository } from './company/company.repository'

export const collectionsRoutes = new Elysia()
  .use(empsaatRoutes)

  .get('/companies', async () => {
    return companyRepository.listActive()
  })

  .get('/companies/:slug', async ({ params }) => {
    const company = await companyRepository.getBySlug(params.slug)
    if (!company) throw new Error('Empresa no encontrada')
    return company
  })
