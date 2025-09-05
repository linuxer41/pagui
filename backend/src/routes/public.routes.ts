import { Elysia } from 'elysia';
import healthRoutes from './health.routes';

// Rutas públicas que no requieren autenticación
export const publicRoutes = new Elysia()
  .use(healthRoutes);
