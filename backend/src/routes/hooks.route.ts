import { Elysia } from 'elysia';
import { BANECO_NotifyPaymentQRRequestSchema } from '../schemas/baneco.scheamas';
import qrService from '../services/qr.service';


// Rutas para hooks
export const hooksRoutes = new Elysia({ prefix: '/hooks' })
  .post('/baneco/notifyPayment', async ({ body }) => {
    return await qrService.banecoQRNotify(body);
  }, {
    body: BANECO_NotifyPaymentQRRequestSchema,
    detail: {
      tags: ['hooks'],
      summary: 'Notificar pago de QR Baneco'
    }
  });
export default hooksRoutes; 