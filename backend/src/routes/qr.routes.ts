import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import qrService from '../services/qr.service';
import apiKeyService from '../services/apikey.service';
import { QRRequestSchema } from '../schemas/qr.schemas';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});

// Rutas para códigos QR
export const qrRoutes = new Elysia({ prefix: '/qr' })
  // Rutas que requieren autenticación
  .use(authMiddleware({ type: 'all', level: 'user' }))
  
  // Generar QR - Accesible vía API key o JWT
  .post('/generate', async ({ body, auth }) => {
    // Obtener userId según el tipo de autenticación
    let userId: number | undefined;
    let bankCredentialId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id; 
      bankCredentialId = auth.user!.bankCredentialId;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_generate'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para generar QR', 403);
      }
      userId = auth.apiKeyInfo!.userId;
      bankCredentialId = auth.apiKeyInfo!.bankCredentialId;
    } else {
      throw new ApiError('No autorizado', 401);
    }
    
    
    // Generar el QR
    if (!userId) {
      throw new ApiError('Usuario no autenticado', 401);
    }
    const data = await qrService.generate(userId, body, bankCredentialId); // environment = 2 (producción)
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
      summary: 'Generar código QR para cobro'
    }
  })
  
  // Cancelar QR
  .delete('/cancelQR', async ({ body, auth }) => {
    // Obtener userId según el tipo de autenticación
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
    
    const data = await qrService.cancelQR(body.qrId, userId!);
    return {
      success: true,
      message: 'QR cancelado exitosamente',
      data
    };
  }, {
    body: t.Object({
      qrId: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Cancelar código QR'
    }
  })
  
  // Verificar estado de QR
  .get('/:id/status', async ({ params, auth }) => {
    // Obtener userId según el tipo de autenticación
    let userId: number | undefined;
    let bankCredentialId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id;
      bankCredentialId = auth.user!.bankCredentialId;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_status'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para verificar estado de QR', 403);
      }
      userId = auth.apiKeyInfo!.userId;
      bankCredentialId = auth.apiKeyInfo!.bankCredentialId;
    } else {
      throw new ApiError('No autorizado', 401);
    }
    
    const data = await qrService.getQRDetails(params.id, bankCredentialId!);
    return {
      success: true,
      message: 'Estado del QR verificado',
      data
    };
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Verificar estado de un código QR'
    }
  })
  
  // Listar todos los QR de una empresa con filtros
  .get('/list', async ({ query, auth }) => {
    // Obtener userId según el tipo de autenticación
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.apiKey, 
        'qr_status'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para listar QRs', 403);
      }
      userId = auth.apiKeyInfo!.userId;
    } else {
      throw new ApiError('Se requiere autenticación válida para esta operación', 401);
    }
    
    const data = await qrService.getQRList(userId!, {
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate
    });
    return {
      success: true,
      message: 'QR listados exitosamente',
      data
    };
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
      bankId: t.Optional(t.Numeric())
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Listar códigos QR con filtros'
    }
  })
  
  // Simular pago de QR (solo para ambiente de desarrollo) - TEMPORALMENTE DESHABILITADO
  /*
  .post('/simulatePayment', async ({ body, auth }) => {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError('Esta operación solo está disponible en ambiente de desarrollo', 403);
    }
    
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    // TODO: Implementar simulateQRPayment en el servicio
    throw new ApiError('Funcionalidad no implementada', 501);
  }, {
    body: t.Object({
      qrId: t.String(),
      amount: t.Optional(t.Number()),
      senderBankCode: t.Optional(t.String()),
      senderName: t.Optional(t.String())
    }),
    response: ResponseSchema,
    detail: {
      tags: ['qr'],
      summary: 'Simular pago de un código QR (solo para desarrollo)'
    }
  })
  */

export default qrRoutes; 