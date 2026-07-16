import { Elysia, t } from 'elysia'
import { authMiddleware, requireRole } from '../../shared/middleware/auth.middleware'
import { getRate, convert, setRate, getAllRates, getSupportedCurrencies } from './fx.service'
import { ok } from '../../shared/response'
import { AppError } from '../../shared/errors/app-error'

export const fxRoutes = new Elysia({ prefix: '/fx' })
  .derive(authMiddleware)
  .get('/rates', async () => {
    return ok({ currencies: await getSupportedCurrencies(), rates: await getAllRates() })
  }, {
    detail: { tags: ['FX'], summary: 'Obtener todas las tasas de cambio' },
  })
  .get('/rate/:base/:target', async ({ params }) => {
    const rate = await getRate(params.base, params.target)
    if (!rate) throw new AppError(404, 'Tasa de cambio no encontrada')
    return ok({ base: params.base, target: params.target, rate })
  }, {
    params: t.Object({ base: t.String(), target: t.String() }),
    detail: { tags: ['FX'], summary: 'Obtener tasa de cambio específica' },
  })
  .post('/convert', async ({ body }) => {
    const result = await convert(body.amount, body.from, body.to)
    if (!result) throw new AppError(404, 'Tasa de cambio no disponible')
    return ok(result)
  }, {
    body: t.Object({
      amount: t.Number({ minimum: 0.01 }),
      from: t.String({ minLength: 3, maxLength: 3 }),
      to: t.String({ minLength: 3, maxLength: 3 }),
    }),
    detail: { tags: ['FX'], summary: 'Convertir moneda' },
  })
  .post('/rates', async ({ body }) => {
    await setRate(body.base, body.target, body.rate, body.source)
    return ok(null)
  }, {
    body: t.Object({
      base: t.String({ minLength: 3, maxLength: 3 }),
      target: t.String({ minLength: 3, maxLength: 3 }),
      rate: t.Number({ minimum: 0.0001 }),
      source: t.Optional(t.String()),
    }),
    detail: { tags: ['FX'], summary: 'Actualizar tasa de cambio' },
  })
