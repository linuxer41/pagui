import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import apiKeyService from '../services/apikey.service';

// Rutas para API keys
export const apiKeyRoutes = new Elysia({ prefix: '/api-keys' })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))
  
  // Listar API keys de la empresa
  .get('/', async ({ auth }) => {
    return await apiKeyService.listApiKeys(auth.user!.companyId);
  }, {
    detail: {
      tags: ['api-keys'],
      summary: 'Listar API keys de la empresa'
    }
  })
  
  // Generar nueva API key
  .post('/', async ({ body, auth }) => {
    if (auth?.type !== 'jwt') {
      return {
        responseCode: 1,
        message: 'Se requiere autenticación de usuario para esta operación'
      };
    }
    
    // Solo administradores pueden crear API keys
    if (auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Se requiere rol de administrador para esta operación'
      };
    }
    
    return await apiKeyService.generateApiKey(
      auth.user!.companyId,
      body.description,
      body.permissions,
      body.expiresAt,
      auth.user!.id
    );
  }, {
    body: t.Object({
      description: t.String(),
      permissions: t.Object({
        qr_generate: t.Boolean(),
        qr_status: t.Boolean(),
        qr_cancel: t.Boolean()
      }),
      expiresAt: t.Optional(t.String())
    }),
    detail: {
      tags: ['api-keys'],
      summary: 'Generar nueva API key'
    }
  })
  
  // Revocar API key
  .delete('/:id', async ({ params, auth }) => {
    if (auth?.type !== 'jwt') {
      return {
        responseCode: 1,
        message: 'Se requiere autenticación de usuario para esta operación'
      };
    }
    
    // Solo administradores pueden revocar API keys
    if (auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Se requiere rol de administrador para esta operación'
      };
    }
    
    return await apiKeyService.revokeApiKey(
      Number(params.id),
      auth.user!.companyId,
      auth.user!.id
    );
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    detail: {
      tags: ['api-keys'],
      summary: 'Revocar una API key'
    }
  });

export default apiKeyRoutes; 