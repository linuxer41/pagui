import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import qrService from '../services/qr.service';
import apiKeyService from '../services/apikey.service';
import accountService from '../services/account.service';
import { QRRequestSchema } from '../schemas/qr.schemas';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});

// Rutas para códigos QR simplificadas
export const qrRoutes = new Elysia({ prefix: '/qr' })
  .use(authMiddleware({ type: 'all', level: 'user' }))
  
  // Generar QR
  .post('/generate', async ({ body, auth }) => {
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id; 
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_generate'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para generar QR', 403);
      }
      userId = auth.apiKeyInfo!.userId;
    } else {
      throw new ApiError('No autorizado', 401);
    }

    // Obtener las cuentas del usuario y usar la cuenta primaria
    const userAccounts = await accountService.getUserAccounts(userId);
      if (userAccounts.length === 0) {
      throw new ApiError('Usuario no tiene cuentas asociadas', 400);
    }

    console.log('userAccounts',userAccounts);
    
    const primaryAccount = userAccounts.find(acc => acc.isPrimary) || userAccounts[0];
    const accountId = primaryAccount.id;
    
    const data = await qrService.generate(accountId, body, primaryAccount.thirdBankCredentialId);
    return {
      success: true,
      message: 'QR generado exitosamente',
      data
    };
  }, {
    body: QRRequestSchema,
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Generar código QR'
    }
  })
  
  // Obtener lista de QRs de una cuenta
  .get('/list', async ({ query, auth }) => {
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_list'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para listar QRs', 403);
      }
      userId = auth.apiKeyInfo!.userId;
    } else {
      throw new ApiError('No autorizado', 401);
    }

    // Obtener las cuentas del usuario
    const userAccounts = await accountService.getUserAccounts(userId);
    if (userAccounts.length === 0) {
      throw new ApiError('Usuario no tiene cuentas asociadas', 400);
    }
    
    const primaryAccount = userAccounts.find(acc => acc.isPrimary) || userAccounts[0];
    const accountId = primaryAccount.id;
    
    // Parámetros de consulta
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const status = query.status;
    const startDate = query.startDate;
    const endDate = query.endDate;
    
    const filters = {
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    };
    
    const data = await qrService.getQRList(accountId, filters, page, limit);
    return {
      success: true,
      message: 'Lista de QRs obtenida exitosamente',
      data
    };
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String())
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Obtener lista de QRs de una cuenta'
    }
  })
  
  // Obtener detalles del QR (imagen y detalles básicos)
  .get('/:id', async ({ params, auth }) => {
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_status'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para verificar estado de QR', 403);
      }
      userId = auth.apiKeyInfo!.userId;
    } else {
      throw new ApiError('No autorizado', 401);
    }

    // Obtener las cuentas del usuario
    const userAccounts = await accountService.getUserAccounts(userId);
    if (userAccounts.length === 0) {
      throw new ApiError('Usuario no tiene cuentas asociadas', 400);
    }
    
    const primaryAccount = userAccounts.find(acc => acc.isPrimary) || userAccounts[0];
    const accountId = primaryAccount.id;
    
    const data = await qrService.checkQRStatus(params.id, userId);
    return {
      success: true,
      message: 'Detalles del QR obtenidos exitosamente',
      data
    };
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Obtener detalles del QR (imagen y información básica)'
    }
  })
  
  // Obtener pagos del QR desde Baneco
  .get('/:id/payments', async ({ params, auth }) => {
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_payments'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para obtener pagos de QR', 403);
      }
      userId = auth.apiKeyInfo!.userId;
    } else {
      throw new ApiError('No autorizado', 401);
    }

    // Obtener las cuentas del usuario
    const userAccounts = await accountService.getUserAccounts(userId);
    if (userAccounts.length === 0) {
      throw new ApiError('Usuario no tiene cuentas asociadas', 400);
    }
    
    const primaryAccount = userAccounts.find(acc => acc.isPrimary) || userAccounts[0];
    const accountId = primaryAccount.id;
    
    const payments = await qrService.getQRPayments(params.id, userId);
    return {
      success: true,
      message: 'Pagos del QR obtenidos exitosamente',
      data: {
        qrId: params.id,
        payments
      }
    };
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Obtener pagos del QR desde Baneco'
    }
  })
  
  // Cancelar QR
  .delete('/:id', async ({ params, auth }) => {
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_cancel'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para cancelar QR', 403);
      }
      userId = auth.apiKeyInfo!.userId;
    } else {
      throw new ApiError('No autorizado', 401);
    }

    // Obtener las cuentas del usuario
    const userAccounts = await accountService.getUserAccounts(userId);
    if (userAccounts.length === 0) {
      throw new ApiError('Usuario no tiene cuentas asociadas', 400);
    }
    
    const primaryAccount = userAccounts.find(acc => acc.isPrimary) || userAccounts[0];
    const accountId = primaryAccount.id;
    
    const success = await qrService.cancelQR(params.id, accountId);
    return {
      success,
      message: success ? 'QR cancelado exitosamente' : 'Error al cancelar QR'
    };
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Cancelar QR'
    }
  });

export default qrRoutes;