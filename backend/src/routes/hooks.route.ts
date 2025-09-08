import { Elysia, t } from 'elysia';
import { BANECO_NotifyPaymentQRRequestSchema } from '../schemas/baneco.scheamas';
import qrService from '../services/qr.service';
import { ApiError } from '../utils/error';

// Rutas para hooks
export const hooksRoutes = new Elysia({ prefix: '/hooks' })

  // Hook específico para Baneco (usando la misma funcionalidad de notificación)
  .post('/baneco/notifyPayment', async ({ body, request, headers,  }) => {
    try {
      console.log('request notifyPayment',request,);
      console.log('body notifyPayment',body, );
      console.log('headers notifyPayment',headers, );
      await qrService.banecoQRNotify(body);
      
      // Respuesta exitosa
      console.log('response notifyPayment',{
        responseCode: 0,
        message: ""
      }, );
      return {
        responseCode: 0,
        message: ""
      };
    } catch (error) {
      // En caso de error, se devuelve un código diferente de cero
      console.log('response notifyPayment',{
        responseCode: 1,
        message: error instanceof ApiError ? error.message : "Error al procesar la notificación de pago"
      }, );
      return {
        responseCode: 1,
        message: error instanceof ApiError ? error.message : "Error al procesar la notificación de pago"
      };
    }
  }, {
    // NoValidate: true,
    NoValidate: true,
    body: t.NoValidate(BANECO_NotifyPaymentQRRequestSchema),
    
    detail: {
      // NoValidate: true,
      tags: ['hooks'],
      summary: 'Recibir notificación de pago de QR desde Baneco'
    }
  });

export default hooksRoutes; 