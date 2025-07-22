import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middlewares/auth.middleware';
import companyService from '../../services/company.service';

// Rutas para empresas (solo para administradores del sistema)
export const companiesRoutes = new Elysia({ prefix: '/admin/companies' })
  .use(authMiddleware({ type: 'jwt', level: 'admin' }))
  
  // Listar todas las empresas
  .get('/', async ({ auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await companyService.listCompanies();
  }, {
    detail: {
      tags: ['admin', 'companies'],
      summary: 'Listar todas las empresas'
    }
  })
  
  // Crear nueva empresa
  .post('/', async ({ body, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await companyService.createCompany(body, auth.user!.id);
  }, {
    body: t.Object({
      name: t.String(),
      businessId: t.String(),
      address: t.Optional(t.String()),
      contactEmail: t.String(),
      contactPhone: t.Optional(t.String())
    }),
    detail: {
      tags: ['admin', 'companies'],
      summary: 'Crear nueva empresa'
    }
  })
  
  // Obtener detalles de una empresa
  .get('/:id', async ({ params, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await companyService.getCompanyDetails(Number(params.id));
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    detail: {
      tags: ['admin', 'companies'],
      summary: 'Obtener detalles de una empresa'
    }
  })
  
  // Actualizar una empresa
  .put('/:id', async ({ params, body, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await companyService.updateCompany(Number(params.id), body, auth.user!.id);
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      businessId: t.Optional(t.String()),
      address: t.Optional(t.String()),
      contactEmail: t.Optional(t.String()),
      contactPhone: t.Optional(t.String())
    }),
    detail: {
      tags: ['admin', 'companies'],
      summary: 'Actualizar una empresa'
    }
  })
  
  // Configurar banco para una empresa
  .post('/:id/bank-configs', async ({ params, body, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await companyService.configureBankForCompany(
      Number(params.id),
      body,
      auth.user!.id
    );
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    body: t.Object({
      bankId: t.Number(),
      accountNumber: t.String(),
      merchantId: t.Optional(t.String()),
      encryptionKey: t.Optional(t.String()),
      additionalConfig: t.Optional(t.Object({}))
    }),
    detail: {
      tags: ['admin', 'companies'],
      summary: 'Configurar un banco para una empresa'
    }
  })
  
  // Desactivar una empresa
  .delete('/:id', async ({ params, auth }) => {
    if (auth?.type !== 'jwt' || auth.user!.role !== 'ADMIN') {
      return {
        responseCode: 1,
        message: 'Acceso denegado'
      };
    }
    
    return await companyService.deactivateCompany(Number(params.id), auth.user!.id);
  }, {
    params: t.Object({
      id: t.Numeric()
    }),
    detail: {
      tags: ['admin', 'companies'],
      summary: 'Desactivar una empresa'
    }
  });

export default companiesRoutes; 