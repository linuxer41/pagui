import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {authService} from '../../services/auth.service';

// Rutas para usuarios
export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware({ type: 'jwt', level: 'admin' }))
  
  // Crear nuevo usuario (solo administradores)
  .post('/', async ({ body, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await authService.createUser(
      {
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        companyId: auth.user!.companyId, // Solo puede crear para su empresa
        role: 'USER'
      },
      auth.user!.id
    );
  }, {
    body: t.Object({
      password: t.String(),
      fullName: t.String(),
      email: t.String(),
    }),
    detail: {
      tags: ['admin'],
      summary: 'Crear nuevo usuario'
    }
  })
  
  // Listar usuarios de la empresa
  .get('/', async ({ auth }) => {
    if (auth?.type !== 'jwt') {
      return {
        responseCode: 1,
        message: 'Se requiere autenticación de usuario para esta operación'
      };
    }
    
    return await authService.listUsers(auth.user!.companyId);
  }, {
    detail: {
      tags: ['admin'],
      summary: 'Listar usuarios de la empresa'
    }
  })
  
  // Cambiar contraseña del usuario autenticado
  .post('/change-password', async ({ body, auth }) => {
    if (auth?.type !== 'jwt') {
      return {
        responseCode: 1,
        message: 'Se requiere autenticación de usuario para esta operación'
      };
    }
    
    return await authService.changePassword(
      auth.user!.id,
      body.currentPassword,
      body.newPassword
    );
  }, {
    body: t.Object({
      currentPassword: t.String(),
      newPassword: t.String()
    }),
    detail: {
      tags: ['auth'],
      summary: 'Cambiar contraseña'
    }
  });

export default userRoutes; 