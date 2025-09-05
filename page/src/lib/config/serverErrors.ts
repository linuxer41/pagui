import type { ValidationError } from '../types/api';

// Errores específicos del servidor para operaciones de QR
export const serverErrors: Record<string, ValidationError> = {
  // Errores de empresa
  'EMPRESA_NO_CONFIGURADA': {
    codigo: 'EMPRESA_NO_CONFIGURADA',
    mensaje: 'Empresa no configurada',
    descripcion: 'La empresa solicitada no existe en el sistema o no ha sido configurada correctamente',
    solucion: 'Verifica que el slug de la empresa sea correcto o contacta al administrador del sistema',
    tipo: 'error'
  },
  'EMPRESA_INACTIVA': {
    codigo: 'EMPRESA_INACTIVA',
    mensaje: 'Empresa inactiva',
    descripcion: 'La empresa existe pero está marcada como inactiva en el sistema',
    solucion: 'Contacta al administrador para activar la empresa o verifica su estado',
    tipo: 'warning'
  },
  
  // Errores de autenticación
  'API_KEY_INVALIDA': {
    codigo: 'API_KEY_INVALIDA',
    mensaje: 'API Key inválida',
    descripcion: 'La API Key proporcionada no coincide con la configurada para esta empresa',
    solucion: 'Verifica que estés usando la API Key correcta para esta empresa',
    tipo: 'error'
  },
  
  // Errores de permisos
  'PERMISO_INSUFICIENTE': {
    codigo: 'PERMISO_INSUFICIENTE',
    mensaje: 'Permisos insuficientes',
    descripcion: 'La empresa no tiene los permisos necesarios para realizar esta operación',
    solucion: 'Contacta al administrador para solicitar los permisos adicionales',
    tipo: 'warning'
  },
  
  // Errores de configuración QR
  'CONFIGURACION_QR_INCOMPLETA': {
    codigo: 'CONFIGURACION_QR_INCOMPLETA',
    mensaje: 'Configuración QR incompleta',
    descripcion: 'La empresa no tiene configurados todos los parámetros necesarios para generar códigos QR',
    solucion: 'Completa la configuración QR en el panel de administración',
    tipo: 'warning'
  },
  
  // Errores de validación de parámetros
  'MONTO_INSUFICIENTE': {
    codigo: 'MONTO_INSUFICIENTE',
    mensaje: 'Monto insuficiente',
    descripcion: 'El monto proporcionado es menor al mínimo permitido para esta empresa',
    solucion: 'Verifica el monto mínimo requerido para esta empresa',
    tipo: 'warning'
  },
  'MONTO_EXCESIVO': {
    codigo: 'MONTO_EXCESIVO',
    mensaje: 'Monto excesivo',
    descripcion: 'El monto proporcionado excede el máximo permitido para esta empresa',
    solucion: 'Verifica el monto máximo permitido para esta empresa',
    tipo: 'warning'
  },
  'DESCRIPCION_REQUERIDA': {
    codigo: 'DESCRIPCION_REQUERIDA',
    mensaje: 'Descripción requerida',
    descripcion: 'La descripción del cobro es obligatoria',
    solucion: 'Proporciona una descripción válida para el cobro',
    tipo: 'warning'
  },
  'TRANSACTION_ID_REQUERIDO': {
    codigo: 'TRANSACTION_ID_REQUERIDO',
    mensaje: 'ID de transacción requerido',
    descripcion: 'El ID de transacción es obligatorio para generar el QR',
    solucion: 'Proporciona un ID de transacción válido',
    tipo: 'warning'
  },
  'QR_ID_REQUERIDO': {
    codigo: 'QR_ID_REQUERIDO',
    mensaje: 'ID de QR requerido',
    descripcion: 'El ID del QR es obligatorio para consultar su estado o cancelarlo',
    solucion: 'Proporciona un ID de QR válido',
    tipo: 'warning'
  },
  
  // Errores de estado del QR
  'QR_NO_ENCONTRADO': {
    codigo: 'QR_NO_ENCONTRADO',
    mensaje: 'QR no encontrado',
    descripcion: 'El código QR solicitado no existe en el sistema',
    solucion: 'Verifica que el ID del QR sea correcto',
    tipo: 'error'
  },
  'QR_YA_PAGADO': {
    codigo: 'QR_YA_PAGADO',
    mensaje: 'QR ya pagado',
    descripcion: 'El código QR ya ha sido pagado y no puede ser modificado',
    solucion: 'No es posible modificar un QR que ya ha sido pagado',
    tipo: 'warning'
  },
  'QR_EXPIRADO': {
    codigo: 'QR_EXPIRADO',
    mensaje: 'QR expirado',
    descripcion: 'El código QR ha expirado y no puede ser utilizado',
    solucion: 'Genera un nuevo código QR',
    tipo: 'warning'
  },
  'QR_YA_CANCELADO': {
    codigo: 'QR_YA_CANCELADO',
    mensaje: 'QR ya cancelado',
    descripcion: 'El código QR ya ha sido cancelado anteriormente',
    solucion: 'No es posible cancelar un QR que ya ha sido cancelado',
    tipo: 'warning'
  }
};

// Función para obtener configuración de error por código
export function getServerError(codigo: string): ValidationError | null {
  return serverErrors[codigo] || null;
}

// Función para crear un mensaje de error personalizado del servidor
export function crearMensajeErrorServidor(
  codigo: string, 
  empresaSlug?: string, 
  detallesAdicionales?: string
): string {
  const error = getServerError(codigo);
  
  if (!error) {
    return 'Error desconocido del servidor';
  }
  
  let mensaje = error.mensaje;
  
  if (empresaSlug) {
    mensaje += `: ${empresaSlug}`;
  }
  
  if (detallesAdicionales) {
    mensaje += ` - ${detallesAdicionales}`;
  }
  
  return mensaje;
}

// Función para validar si un error del servidor es crítico
export function esErrorServidorCritico(codigo: string): boolean {
  const error = getServerError(codigo);
  return error?.tipo === 'error';
}
