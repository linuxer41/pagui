import { Elysia } from 'elysia';
import { authRoutes } from './auth.routes';
import healthRoutes from './health.routes';
import { qrRoutes } from './qr.routes';
import { apiKeyRoutes } from './apikey.routes';
import { hooksRoutes } from './hooks.route';
import accountRoutes from './accounts.routes';
import { adminAccountRoutes } from './admin/accounts.routes';
import { eventsRoutes } from './events.routes';

// Router principal simplificado
const routes = new Elysia()
  .use(hooksRoutes)
  
  // Rutas de autenticación
  .use(authRoutes)
  
  // Rutas de salud del sistema
  .use(healthRoutes)
  
  // Rutas protegidas (requieren autenticación)
  .use(qrRoutes)
  .use(accountRoutes)
  .use(apiKeyRoutes)
  
  // Rutas de administración
  .use(adminAccountRoutes)
  
  // Rutas de eventos SSE
  .use(eventsRoutes);
  

export { routes };