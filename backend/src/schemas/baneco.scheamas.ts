import { Type as t } from '@sinclair/typebox'

/**
 * Información del pago QR (usado en notificaciones, consultas y listas)
 */
export const BANECO_PaymentQRSchema = t.Object({
  qrId: t.String({ description: 'Identificador único del QR' }),
  transactionId: t.String({ description: 'Número de transacción del banco' }),
  paymentDate: t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Fecha del pago' }),
  paymentTime: t.String({ pattern: '^\\d{2}:\\d{2}:\\d{2}$', description: 'Hora del pago (formato HH:mm:ss)' }),
  currency: t.Union([
    t.Literal('BOB'),
    t.Literal('USD')
  ], { description: 'Moneda del pago (BOB o USD)' }),
  amount: t.Number({ description: 'Importe del pago recibido' }),
  senderBankCode: t.String({ description: 'Código ASFI del banco que origina el pago' }),
  senderName: t.String({ description: 'Nombre o razón social de quien envía el pago' }),
  senderDocumentId: t.String({ description: 'Número de documento (no se usa, retorna cero)' }),
  senderAccount: t.String({ description: 'Cuenta de origen (dato ofuscado)' }),
  description: t.String({ description: 'Glosa del QR' }),
  branchCode: t.Optional(t.String({ description: 'Código de sucursal solicitante' })),
})

/**
 * Solicitud para generar un código QR
 */
export const BANECO_QRGenerateRequestSchema = t.Object({
  transactionId: t.String({ description: 'ID único de la transacción en el comercio' }),
  accountCredit: t.String({ description: 'Cuenta destino encriptada con AES' }),
  currency: t.Union([
    t.Literal('BOB'),
    t.Literal('USD')
  ], { description: 'Moneda del pago' }),
  amount: t.Number({ description: 'Importe del QR con máximo 2 decimales' }),
  description: t.Optional(t.String({ description: 'Nota del cobro (opcional)' })),
  dueDate: t.String({ format: 'date', description: 'Fecha de vencimiento (yyyy-MM-dd)' }),
  singleUse: t.Boolean({ description: 'Permite solo un pago si es true' }),
  modifyAmount: t.Boolean({ description: 'Permite pagar con importe distinto si es true' }),
  branchCode: t.Optional(t.String({ maxLength: 5, description: 'Código de sucursal (máx 5 caracteres)' }))
})

/**
 * Respuesta de generación de código QR
 */
export const BANECO_QRGenerateResponseSchema = t.Object({
  qrId: t.String({ description: 'Identificador único del QR generado' }),
  qrImage: t.String({ description: 'Imagen del QR en base64' }),
  responseCode: t.Integer({ description: 'Código de respuesta (0 = éxito)' }),
  message: t.String({ description: 'Mensaje adicional o de error' }),
})

/**
 * Solicitud para anular un QR
 */
export const BANECO_QRCancelRequestSchema = t.Object({
  qrId: t.String({ description: 'Identificador único del QR a anular' }),
})

/**
 * Respuesta de anulación de QR
 */
export const BANECO_QRCancelResponseSchema = t.Object({
  responseCode: t.Integer({ description: 'Código de respuesta (0 = éxito)' }),
  message: t.String({ description: 'Mensaje adicional o de error' }),
})

/**
 * Respuesta de consulta de estado QR
 */
export const BANECO_QRStatusResponseSchema = t.Object({
  statusQrCode: t.Integer({
    description: 'Estado del QR: 0 = pendiente, 1 = pagado, 9 = anulado'
  }),
  payment: t.Optional(t.Array(BANECO_PaymentQRSchema, {
    description: 'Lista de pagos asociados (si el estado es 1)'
  })),
  responseCode: t.Integer({ description: 'Código de respuesta' }),
  message: t.String({ description: 'Mensaje de error si corresponde' }),
})

/**
 * Solicitud de notificación de pago QR
 */
export const BANECO_NotifyPaymentQRRequestSchema = t.Object({
  payment: BANECO_PaymentQRSchema
})

/**
 * Respuesta a la notificación de pago QR
 */
export const BANECO_NotifyPaymentQRResponseSchema = t.Object({
  responseCode: t.Integer({ description: 'Código de respuesta (0 = éxito)' }),
  message: t.String({ description: 'Mensaje adicional o de error' }),
})

/**
 * Respuesta de listado de QR pagados por fecha
 */
export const BANECO_PaidQRResponseSchema = t.Object({
  paymentList: t.Array(BANECO_PaymentQRSchema, {
    description: 'Lista de pagos realizados en la fecha consultada'
  }),
  responseCode: t.Integer({ description: 'Código de respuesta (0 = éxito)' }),
  message: t.String({ description: 'Mensaje adicional o de error' }),
})

/**
 * Solicitud de autenticación para obtener token
 */
export const BANECO_AuthRequestSchema = t.Object({
  userName: t.String({ description: 'Nombre de usuario asignado por el banco' }),
  password: t.String({ description: 'Contraseña cifrada con AES' }),
})

/**
 * Respuesta de autenticación con token
 */
export const BANECO_AuthResponseSchema = t.Object({
  token: t.String({ description: 'Token JWT para autenticar solicitudes' }),
  responseCode: t.Integer({ description: 'Código de respuesta (0 = éxito)' }),
  message: t.String({ description: 'Mensaje adicional o de error' }),
})
