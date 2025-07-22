import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middlewares/auth.middleware';
import bankService from '../../services/bank.service';

// Rutas para bancos
export const banksRoutes = new Elysia({ prefix: '/admin/banks' })
  .use(authMiddleware({ type: 'jwt', level: 'admin' }))
  
  // Listar todos los bancos
  .get('/', async ({ auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await bankService.listBanks();
  }, {
    detail: {
      tags: ['admin', 'banks'],
      summary: 'Listar todos los bancos'
    }
  })
  
  // Crear nuevo banco
  .post('/', async ({ body, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await bankService.createBank(body, auth.user!.id);
  }, {
    body: t.Object({
      code: t.String(),
      name: t.String(),
      apiBaseUrl: t.Optional(t.String()),
      apiVersion: t.Optional(t.String()),
      encryptionKey: t.Optional(t.String())
    }),
    detail: {
      tags: ['admin', 'banks'],
      summary: 'Crear nuevo banco'
    }
  })
  
  // Obtener detalles de un banco
  .get('/:id', async ({ params, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await bankService.getBankDetails(Number(params.id));
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    detail: {
      tags: ['admin', 'banks'],
      summary: 'Obtener detalles de un banco'
    }
  })
  
  // Actualizar un banco
  .put('/:id', async ({ params, body, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await bankService.updateBank(
      Number(params.id),
      body,
      auth.user!.id
    );
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    body: t.Object({
      code: t.Optional(t.String()),
      name: t.Optional(t.String()),
      apiBaseUrl: t.Optional(t.String()),
      apiVersion: t.Optional(t.String()),
      encryptionKey: t.Optional(t.String())
    }),
    detail: {
      tags: ['admin', 'banks'],
      summary: 'Actualizar un banco'
    }
  })
  
  // Desactivar un banco
  .delete('/:id', async ({ params, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await bankService.deactivateBank(
      Number(params.id),
      auth.user!.id
    );
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    detail: {
      tags: ['admin', 'banks'],
      summary: 'Desactivar un banco'
    }
  });

export default banksRoutes; 