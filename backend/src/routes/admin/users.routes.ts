import { Elysia, t } from 'elysia';
import { userService } from '../../services/user.service';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { ApiError } from '../../utils/error';

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware({ type: 'jwt', level: 'admin' }))
  
  // GET /users - Listar usuarios
  .get('/', async ({ query, auth }) => {
    try {
      const { page = 1, limit = 20, search, status, entityType, roleId, isPrimaryUser } = query;
      
      const users = await userService.getUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        entityType,
        roleId: roleId ? parseInt(roleId) : undefined,
        isPrimaryUser: isPrimaryUser === 'true'
      });
      
      return {
        success: true,
        data: users,
        pagination: users.pagination
      };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Error al listar usuarios',
        error instanceof ApiError ? error.statusCode : 500
      );
    }
  })