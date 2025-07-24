import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import qrService from '../services/qr.service';
import apiKeyService from '../services/apikey.service';
import { QRRequestSchema } from '../schemas/qr.schemas';
import { BANECO_NotifyPaymentQRRequestSchema } from '../schemas/baneco.scheamas';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});

// Rutas para códigos QR
export const qrRoutes = new Elysia({ prefix: '/qrsimple' })
  .use(authMiddleware({ type: 'all', level: 'user' }))
  
  // Generar QR - Accesible vía API key o JWT
  .post('/generateQR', async ({ body, auth }) => {
    // Obtener companyId según el tipo de autenticación
    let companyId: number;
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      companyId = auth.user!.companyId;
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.companyId.toString(), 
        'qr_generate'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para generar QR', 403);
      }
      companyId = auth.apiKeyInfo!.companyId;
    } else {
      throw new ApiError('No autorizado', 401);
    }
    
    // Obtener bankId del cuerpo o usar el predeterminado
    const bankId = body?.bankId || 1; // 1 = Banco Económico por defecto
    
    // Generar el QR
    const data = await qrService.generateQR(companyId, body, userId, bankId);
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
    // Obtener companyId según el tipo de autenticación
    let companyId: number;
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      companyId = auth.user!.companyId;
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.companyId.toString(), 
        'qr_cancel'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para cancelar QR', 403);
      }
      companyId = auth.apiKeyInfo!.companyId;
    } else {
      throw new ApiError('No autorizado', 401);
    }
    
    const data = await qrService.cancelQR(companyId, body.qrId, userId);
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
    // Obtener companyId según el tipo de autenticación
    let companyId: number;
    let userId: number | undefined;
    
    if (auth?.type === 'jwt') {
      companyId = auth.user!.companyId;
      userId = auth.user!.id;
    } else if (auth?.type === 'apikey') {
      const hasPermission = await apiKeyService.hasPermission(
        auth.apiKeyInfo!.companyId.toString(), 
        'qr_status'
      );
      
      if (!hasPermission) {
        throw new ApiError('API Key no tiene permisos para verificar estado de QR', 403);
      }
      companyId = auth.apiKeyInfo!.companyId;
    } else {
      throw new ApiError('No autorizado', 401);
    }
    
    const data = await qrService.checkQRStatus(companyId, params.id, userId);
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
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    const data = await qrService.listQRs(auth.user!.companyId, {
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      bankId: query.bankId
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
  
  // Simular pago de QR (solo para ambiente de desarrollo)
  .post('/simulatePayment', async ({ body, auth }) => {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError('Esta operación solo está disponible en ambiente de desarrollo', 403);
    }
    
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    const data = await qrService.simulateQRPayment(
      auth.user!.companyId,
      body.qrId,
      {
        amount: body.amount,
        senderBankCode: body.senderBankCode,
        senderName: body.senderName
      },
      auth.user!.id
    );
    return {
      success: true,
      message: 'Pago simulado exitosamente',
      data
    };
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

export default qrRoutes; 