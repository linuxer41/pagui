import { Elysia, t } from 'elysia';
import { apiKeyService } from '../services/apikey.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});

// Esquemas de validación
const CreateApiKeySchema = t.Object({
  description: t.String(),
  permissions: t.Object({
    qr_generate: t.Boolean(),
    qr_status: t.Boolean(),
    qr_cancel: t.Boolean()
  }),
  expiresAt: t.Optional(t.String()) // Fecha de expiración opcional
});

// Rutas para administrar API keys (usuarios principales)
export const apiKeyRoutes = new Elysia({ prefix: '/apikeys' })
  .use(authMiddleware({ type: 'jwt', level: 'user' }))
  
  // POST /apikeys - Crear nueva API key para el usuario autenticado
  .post('/', async ({ body, auth }) => {
    try {
      // Verificar que el usuario esté autenticado
      if (auth?.type !== 'jwt' || !auth.user) {
        throw new ApiError('No autorizado', 401);
      }

      // Crear la API key para el usuario autenticado
      const result = await apiKeyService.generateApiKey(
        auth.user.id, // Usuario autenticado
        body.description,
        body.permissions,
        body.expiresAt,
        auth.user.id // Usuario que crea la API key
      );

      if (result.responseCode !== 0) {
        throw new ApiError(result.message, 400);
      }

      return {
        success: true,
        message: 'API key creada exitosamente',
        data: {
          id: result.id,
          apiKey: result.apiKey,
          description: result.description,
          permissions: result.permissions,
          userId: result.userId,
          expiresAt: result.expiresAt,
          status: result.status,
          createdAt: result.createdAt
        }
      };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Error al crear API key',
        error instanceof ApiError ? error.statusCode : 500
      );
    }
  }, {
    body: CreateApiKeySchema,
    response: ResponseSchema,
    detail: {
      tags: ['apikeys'],
      summary: 'Crear nueva API key para el usuario autenticado'
    }
  })

  // GET /apikeys - Listar API keys del usuario autenticado (sin paginación)
  .get('/', async ({ auth }) => {
    try {
      // Verificar que el usuario esté autenticado
      if (auth?.type !== 'jwt' || !auth.user) {
        throw new ApiError('No autorizado', 401);
      }

      // Listar API keys del usuario autenticado
      const result = await apiKeyService.listApiKeys(auth.user.id);

      if (result.responseCode !== 0) {
        throw new ApiError(result.message, 400);
      }

      return {
        success: true,
        message: 'API keys listadas exitosamente',
        data: {
          apiKeys: result.apiKeys
        }
      };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Error al listar API keys',
        error instanceof ApiError ? error.statusCode : 500
      );
    }
  }, {
    detail: {
      tags: ['apikeys'],
      summary: 'Listar API keys del usuario autenticado'
    }
  })

  // DELETE /apikeys/:id - Revocar API key del usuario autenticado
  .delete('/:id', async ({ params, auth }) => {
    try {
      const apiKeyId = parseInt(params.id);
      
      // Verificar que el usuario esté autenticado
      if (auth?.type !== 'jwt' || !auth.user) {
        throw new ApiError('No autorizado', 401);
      }

      // Revocar la API key (verificar que pertenezca al usuario)
      const result = await apiKeyService.revokeApiKey(
        apiKeyId,
        auth.user.id, // Usuario autenticado
        auth.user.id  // Usuario que revoca
      );

      if (result.responseCode !== 0) {
        throw new ApiError(result.message, 400);
      }

      return {
        success: true,
        message: 'API key revocada exitosamente',
        data: result
      };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Error al revocar API key',
        error instanceof ApiError ? error.statusCode : 500
      );
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['apikeys'],
      summary: 'Revocar API key del usuario autenticado'
    }
  });
