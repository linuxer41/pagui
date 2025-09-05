import { Elysia, t } from 'elysia';
import { BANECO_NotifyPaymentQRRequestSchema } from '../schemas/baneco.scheamas';
import qrService from '../services/qr.service';
import { ApiError } from '../utils/error';

// Rutas para hooks
export const hooksRoutes = new Elysia({ prefix: '/hooks' })

  // Hook específico para Baneco (usando la misma funcionalidad de notificación)
  .post('/baneco/notifyPayment', async ({ body }) => {
    try {
      await qrService.banecoQRNotify(body);
      
      // Respuesta exitosa
      return {
        responseCode: 0,
        message: ""
      };
    } catch (error) {
      // En caso de error, se devuelve un código diferente de cero
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