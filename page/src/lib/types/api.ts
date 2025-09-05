// Tipos para las respuestas de la API del servidor - Solo operaciones QR

// Tipos para la respuesta de generación de QR de la API externa
export interface QRGenerationData {
  qrId: string;
  qrImage: string;
  transactionId: string;
  amount: number;
  currency: string;
  dueDate: string;
  singleUse: boolean;
  modifyAmount: boolean;
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
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
  accountNumber?: string;
  accountName?: string;
  description?: string;
  singleUse?: boolean;
  modifyAmount?: boolean;
  createdAt?: string;
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

export interface QRData {
  qrId: string;
  transactionId: string;
  monto: number;
  descripcion: string;
  empresa: string;
  fechaCreacion: string;
  estado: 'pendiente' | 'pagado' | 'expirado' | 'cancelado';
}

export interface EstadoQR {
  qrId: string;
  estado: 'pendiente' | 'pagado' | 'expirado' | 'cancelado';
  fechaActualizacion: string;
  empresa: string;
}

// Tipos para errores de validación
export interface ValidationError {
  codigo: string;
  mensaje: string;
  descripcion: string;
  solucion: string;
  tipo: 'error' | 'warning' | 'info';
}

// Tipos para respuestas de validación
export interface ValidationResult<T = any> {
  valido: boolean;
  data?: T;
  error?: ValidationError;
  mensaje: string;
}

// Respuestas específicas para cada operación
export interface GenerarQRResponse {
  success: boolean;
  qrData?: QRData;
  error?: string;
  codigo?: string;
  mensaje?: string;
}

export interface ConsultarEstadoResponse {
  success: boolean;
  estadoQR?: EstadoQR;
  error?: string;
  codigo?: string;
  mensaje?: string;
}

export interface AnularQRResponse {
  success: boolean;
  error?: string;
  codigo?: string;
  mensaje?: string;
}
