// Tipos para las respuestas de la API del servidor - Solo operaciones QR

// Tipos para la respuesta de generación de QR de la API externa
export interface QRGenerationData {
  qrId: string;
  qrImage?: string; // Imagen del QR en base64 (opcional según documentación)
  qrCode?: string;  // Código del QR (alternativo)
  qrUrl?: string;   // URL del QR (alternativo)
  transactionId: string;
  amount: number;
  currency?: string; // Opcional según documentación
  dueDate: string;
  singleUse: boolean;
  modifyAmount: boolean;
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
  createdAt?: string;
  expiresAt?: string;
}

export interface QRGenerationAPIResponse {
  success: boolean;
  message: string;
  data: QRGenerationData;
}

// Tipos para la respuesta de verificación de estado de la API externa
export interface QRStatusData {
  qrId: string;
  status: 'active' | 'inactive' | 'expired' | 'cancelled' | 'paid' | 'used';
  amount?: number;
  currency?: string;
  dueDate?: string;
  transactionId?: string;
  description?: string;
  singleUse?: boolean;
  modifyAmount?: boolean;
  createdAt?: string;
  expiresAt?: string;
  payments?: PaymentData[];
}

// Interfaz para los datos de pago
export interface PaymentData {
  qrId: string;
  transactionId: string;
  paymentDate: string;
  paymentTime: string;
  currency: string;
  amount: number;
  senderBankCode: string;
  senderName: string;
  senderDocumentId: string;
  senderAccount: string;
  description: string;
}

export interface QRStatusAPIResponse {
  success: boolean;
  message: string;
  data: QRStatusData;
}

// Tipos para la respuesta de cancelación de QR de la API externa
export interface QRCancellationData {
  qrId: string;
  status: 'cancelled';
  cancelledAt: string;
  reason?: string;
}

export interface QRCancellationAPIResponse {
  success: boolean;
  message: string;
  data: QRCancellationData;
}

// Tipos para la respuesta de pagos de QR
export interface QRPaymentsAPIResponse {
  success: boolean;
  message: string;
  data: PaymentData[];
}

// Tipos para respuestas de error de la API
export interface APIErrorResponse {
  success: false;
  error: string;
  codigo: string;
}

// Tipos para respuestas exitosas del servidor
export interface ServerSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

// Tipos para respuestas de fallo del servidor
export interface ServerFailResponse {
  success: false;
  error: string;
  codigo?: string;
}

// Union type para todas las respuestas del servidor
export type ServerResponse<T = any> = ServerSuccessResponse<T> | ServerFailResponse;

// Tipos para respuestas de error de la API
export interface APIErrorResponse {
  success: false;
  error: string;
  codigo: string;
}
