import { Elysia, t } from 'elysia';
import { apiKeyService } from '../services/apikey.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { ApiError } from '../utils/error';
import { query } from '../config/database';

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
  
  // POST /apikeys - Crear nueva API key para la cuenta primaria del usuario autenticado
  .post('/', async ({ body, auth }) => {
    try {
      // Verificar que el usuario esté autenticado
      if (auth?.type !== 'jwt' || !auth.user) {
        throw new ApiError('No autorizado', 401);
      }

      // Obtener la cuenta primaria del usuario
      const accountResult = await query(`
        SELECT ua.account_id
        FROM user_accounts ua
        WHERE ua.user_id = $1 AND ua.is_primary = true
      `, [auth.user.id]);

      if (accountResult.rowCount === 0) {
        throw new ApiError('No se encontró cuenta primaria para el usuario', 404);
      }

      const accountId = accountResult.rows[0].account_id;

      // Crear la API key para la cuenta primaria
      const result = await apiKeyService.generateApiKey(
        accountId,
        body.description,
        body.permissions,
        body.expiresAt
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
          accountId: result.accountId,
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

  // GET /apikeys - Listar API keys de la cuenta primaria del usuario autenticado
  .get('/', async ({ auth }) => {
    try {
      // Verificar que el usuario esté autenticado
      if (auth?.type !== 'jwt' || !auth.user) {
        throw new ApiError('No autorizado', 401);
      }

      // Obtener la cuenta primaria del usuario
      const accountResult = await query(`
        SELECT ua.account_id
        FROM user_accounts ua
        WHERE ua.user_id = $1 AND ua.is_primary = true
      `, [auth.user.id]);

      if (accountResult.rowCount === 0) {
        throw new ApiError('No se encontró cuenta primaria para el usuario', 404);
      }

      const accountId = accountResult.rows[0].account_id;

      // Listar API keys de la cuenta primaria
      const result = await apiKeyService.listApiKeys(accountId);

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

  // DELETE /apikeys/:id - Revocar API key de la cuenta primaria del usuario autenticado
  .delete('/:id', async ({ params, auth }) => {
    try {
      const apiKeyId = parseInt(params.id);
      
      // Verificar que el usuario esté autenticado
      if (auth?.type !== 'jwt' || !auth.user) {
        throw new ApiError('No autorizado', 401);
      }

      // Obtener la cuenta primaria del usuario
      const accountResult = await query(`
        SELECT ua.account_id
        FROM user_accounts ua
        WHERE ua.user_id = $1 AND ua.is_primary = true
      `, [auth.user.id]);

      if (accountResult.rowCount === 0) {
        throw new ApiError('No se encontró cuenta primaria para el usuario', 404);
      }

      const accountId = accountResult.rows[0].account_id;

      // Revocar la API key (verificar que pertenezca a la cuenta)
      const result = await apiKeyService.revokeApiKey(
        apiKeyId,
        accountId
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
