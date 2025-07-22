import { Elysia } from 'elysia';

import authRoutes from './auth.routes';
import qrRoutes from './qr.routes';
import apiKeyRoutes from './apikeys.routes';
import userRoutes from './admin/users.routes';
import companiesRoutes from './admin/companies.routes';
import banksRoutes from './admin/banks.routes';
import hooksRoutes from './hooks.route';
import transactionsRoutes from './transactions.routes';

// Agrupar todas las rutas
export const routes = new Elysia({ prefix: '/api' })
  .use(authRoutes)
  .use(qrRoutes)
  .use(apiKeyRoutes)
  .use(userRoutes)
  .use(companiesRoutes)
  .use(banksRoutes)
  .use(hooksRoutes)
  .use(transactionsRoutes)