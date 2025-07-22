import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import qrService from '../services/qr.service';
import apiKeyService from '../services/apikey.service';
import { QRRequestSchema } from '../schemas/qr.schemas';
import { BANECO_NotifyPaymentQRRequestSchema } from '../schemas/baneco.scheamas';


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
        return {
          responseCode: 1,
          message: 'API Key no tiene permisos para generar QR'
        };
      }
      companyId = auth.apiKeyInfo!.companyId;
    } else {
      return {
        responseCode: 1,
        message: 'No autorizado'
      };
    }
    
    // Obtener bankId del cuerpo o usar el predeterminado
    const bankId = body?.bankId || 1; // 1 = Banco Económico por defecto
    
    // Generar el QR
    return await qrService.generateQR(companyId, body, userId, bankId);
  }, {
    body: QRRequestSchema,
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
        return {
          responseCode: 1,
          message: 'API Key no tiene permisos para cancelar QR'
        };
      }
      companyId = auth.apiKeyInfo!.companyId;
    } else {
      return {
        responseCode: 1,
        message: 'No autorizado'
      };
    }
    
    return await qrService.cancelQR(companyId, body.qrId, userId);
  }, {
    body: t.Object({
      qrId: t.String()
    }),
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
        return {
          responseCode: 1,
          message: 'API Key no tiene permisos para verificar estado de QR'
        };
      }
      companyId = auth.apiKeyInfo!.companyId;
    } else {
      return {
        responseCode: 1,
        message: 'No autorizado'
      };
    }
    
    return await qrService.checkQRStatus(companyId, params.id, userId);
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['qr'],
      summary: 'Verificar estado de un código QR'
    }
  })
  
  // Listar todos los QR de una empresa con filtros
  .get('/list', async ({ query, auth }) => {
    if (auth?.type !== 'jwt') {
      return {
        responseCode: 1,
        message: 'Se requiere autenticación de usuario para esta operación'
      };
    }
    
    return await qrService.listQRs(auth.user!.companyId, {
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      bankId: query.bankId
    });
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
      bankId: t.Optional(t.Numeric())
    }),
    detail: {
      tags: ['qr'],
      summary: 'Listar códigos QR con filtros'
    }
  })
  
  // Simular pago de QR (solo para ambiente de desarrollo)
  .post('/simulatePayment', async ({ body, auth }) => {
    if (process.env.NODE_ENV === 'production') {
      return {
        responseCode: 1,
        message: 'Esta operación solo está disponible en ambiente de desarrollo'
      };
    }
    
    if (auth?.type !== 'jwt') {
      return {
        responseCode: 1,
        message: 'Se requiere autenticación de usuario para esta operación'
      };
    }
    
    return await qrService.simulateQRPayment(
      auth.user!.companyId,
      body.qrId,
      {
        amount: body.amount,
        senderBankCode: body.senderBankCode,
        senderName: body.senderName
      },
      auth.user!.id
    );
  }, {
    body: t.Object({
      qrId: t.String(),
      amount: t.Optional(t.Number()),
      senderBankCode: t.Optional(t.String()),
      senderName: t.Optional(t.String())
    }),
    detail: {
      tags: ['qr'],
      summary: 'Simular pago de un código QR (solo para desarrollo)'
    }
  })

export default qrRoutes; 