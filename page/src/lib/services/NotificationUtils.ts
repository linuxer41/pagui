// Utilidades para notificaciones de pago SSE

// Store para mantener las conexiones SSE activas
const connections = new Map<string, ReadableStreamDefaultController>();

// Store para mantener el estado de los pagos
const paymentStatus = new Map<string, {
  qrId: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  amount: number;
  transactionId: string;
  abonado: string;
  deudasAgua: any[];
  deudasServicios: any[];
  timestamp: number;
}>();

// Función para notificar a todas las conexiones de un QR específico
export function notifyPayment(qrId: string, status: any) {
  const controller = connections.get(qrId);
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify(status)}\n\n`);
    } catch (error) {
      console.error('Error enviando notificación SSE:', error);
      connections.delete(qrId);
    }
  }
}

// Función para actualizar el estado de pago
export function updatePaymentStatus(qrId: string, status: any) {
  paymentStatus.set(qrId, {
    ...status,
    timestamp: Date.now()
  });
  
  // Notificar a la conexión
  notifyPayment(qrId, status);
}

// Función para obtener el estado de pago
export function getPaymentStatus(qrId: string) {
  return paymentStatus.get(qrId);
}

// Función para limpiar estados antiguos (más de 1 hora)
export function cleanupOldStatuses() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [qrId, status] of paymentStatus.entries()) {
    if (status.timestamp < oneHourAgo) {
      paymentStatus.delete(qrId);
      connections.delete(qrId);
    }
  }
}

// Función para agregar una conexión
export function addConnection(qrId: string, controller: ReadableStreamDefaultController) {
  connections.set(qrId, controller);
}

// Función para remover una conexión
export function removeConnection(qrId: string) {
  connections.delete(qrId);
}

// Limpiar estados antiguos cada 30 minutos
setInterval(cleanupOldStatuses, 30 * 60 * 1000);
