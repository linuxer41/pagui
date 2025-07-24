import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import apiKeyService from '../services/apikey.service';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});
// Rutas para API keys
export const apiKeyRoutes = new Elysia({ prefix: '/api-keys' })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))
  
  // Listar API keys de la empresa
  .get('/', async ({ auth }) => {
    const data = await apiKeyService.listApiKeys(auth.user!.companyId);
    return {
      success: true,
      message: 'API keys listadas exitosamente',
      data
    };
  }, {
    response: ResponseSchema,
    detail: {
      tags: ['api-keys'],
      summary: 'Listar API keys de la empresa'
    }
  })
  
  // Generar nueva API key
  .post('/', async ({ body, auth }) => {
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    // Solo administradores pueden crear API keys
    if (auth.user!.role !== 'ADMIN') {
      throw new ApiError('Se requiere rol de administrador para esta operación', 403);
    }
    
    const data = await apiKeyService.generateApiKey(
      auth.user!.companyId,
      body.description,
      body.permissions,
      body.expiresAt,
      auth.user!.id
    );
    return {
      success: true,
      message: 'API key generada exitosamente',
      data
    };
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
    response: ResponseSchema,
    detail: {
      tags: ['api-keys'],
      summary: 'Generar nueva API key'
    }
  })
  
  // Revocar API key
  .delete('/:id', async ({ params, auth }) => {
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    // Solo administradores pueden revocar API keys
    if (auth.user!.role !== 'ADMIN') {
      throw new ApiError('Se requiere rol de administrador para esta operación', 403);
    }
    
    const data = await apiKeyService.revokeApiKey(
      Number(params.id),
      auth.user!.companyId,
      auth.user!.id
    );
    return {
      success: true,
      message: 'API key revocada exitosamente',
      data
    };
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['api-keys'],
      summary: 'Revocar una API key'
    }
  });

export default apiKeyRoutes; 