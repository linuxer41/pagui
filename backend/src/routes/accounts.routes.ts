import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import accountService from '../services/account.service';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});

// Rutas de cuentas simplificadas
const accountRoutes = new Elysia({ prefix: '/accounts' })
  .use(authMiddleware({ type: 'all', level: 'user' }))
  
  // Obtener todas las cuentas del usuario autenticado (sin paginación)
  .get('/', async ({ auth }) => {
    try {
      const userId = auth.type === 'jwt' ? auth.user!.id : auth.apiKeyInfo!.userId;
      const accounts = await accountService.getUserAccounts(userId);
      
      return {
        success: true,
        data: accounts,
        message: 'Cuentas obtenidas exitosamente'
      };
    } catch (error) {
      console.error('Error obteniendo cuentas:', error);
      throw new ApiError('Error interno del servidor', 500);
    }
  }, {
    response: ResponseSchema,
    detail: {
      tags: ['accounts'],
      summary: 'Obtener todas las cuentas del usuario autenticado'
    }
  })
  
  // Obtener una cuenta específica del usuario
  .get('/:id', async ({ params, auth }) => {
    try {
      const userId = auth.type === 'jwt' ? auth.user!.id : auth.apiKeyInfo!.userId;
      const accountId = parseInt(params.id);
      
      if (isNaN(accountId)) {
        throw new ApiError('ID de cuenta inválido', 400);
      }
      
      const account = await accountService.getUserAccount(userId, accountId);
      
      if (!account) {
        throw new ApiError('Cuenta no encontrada o no tienes acceso', 404);
      }
      
      return {
        success: true,
        data: account,
        message: 'Cuenta obtenida exitosamente'
      };
    } catch (error) {
      console.error('Error obteniendo cuenta:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Error interno del servidor', 500);
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['accounts'],
      summary: 'Obtener una cuenta específica del usuario'
    }
  })
  
  // Obtener historial de movimientos de una cuenta
  .get('/:id/movements', async ({ params, query, auth }) => {
    try {
      const userId = auth.type === 'jwt' ? auth.user!.id : auth.apiKeyInfo!.userId;
      const accountId = parseInt(params.id);
      const page = parseInt(query.page || '1');
      const pageSize = parseInt(query.pageSize || '20');
      
      if (isNaN(accountId)) {
        throw new ApiError('ID de cuenta inválido', 400);
      }
      
      // Verificar que el usuario tiene acceso a esta cuenta
      const account = await accountService.getUserAccount(userId, accountId);
      if (!account) {
        throw new ApiError('Cuenta no encontrada o no tienes acceso', 404);
      }
      
      const offset = (page - 1) * pageSize;
      const { movements, total, totalPages } = await accountService.getAccountMovements(
        accountId,
        pageSize,
        offset
      );
      
      return {
        success: true,
        data: movements,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        message: 'Movimientos obtenidos exitosamente'
      };
    } catch (error) {
      console.error('Error obteniendo movimientos:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Error interno del servidor', 500);
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    query: t.Object({
      page: t.Optional(t.String()),
      pageSize: t.Optional(t.String())
    }),
    response: ResponseSchema,
    detail: {
      tags: ['accounts'],
      summary: 'Obtener movimientos de una cuenta específica'
    }
  })
  
  // Obtener estadísticas de recaudaciones de una cuenta
  .get('/:id/stats', async ({ params, auth }) => {
    try {
      const userId = auth.type === 'jwt' ? auth.user!.id : auth.apiKeyInfo!.userId;
      const accountId = parseInt(params.id);
      
      if (isNaN(accountId)) {
        throw new ApiError('ID de cuenta inválido', 400);
      }

      // Verificar que el usuario tiene acceso a esta cuenta
      const userAccounts = await accountService.getUserAccounts(userId);
      const hasAccess = userAccounts.some(account => account.id === accountId);
      
      if (!hasAccess) {
        throw new ApiError('No tienes acceso a esta cuenta', 403);
      }

      // Obtener estadísticas
      const stats = await accountService.getAccountStats(accountId);
      
      return {
        success: true,
        data: stats,
        message: 'Estadísticas obtenidas exitosamente'
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Error interno del servidor', 500);
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['accounts'],
      summary: 'Obtener estadísticas de recaudaciones de una cuenta'
    }
  });

export default accountRoutes;