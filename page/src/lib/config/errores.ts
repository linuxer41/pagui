export interface ErrorConfig {
  codigo: string;
  mensaje: string;
  descripcion: string;
  solucion: string;
  tipo: 'error' | 'warning' | 'info';
}

export const erroresEmpresa: Record<string, ErrorConfig> = {
  'EMPRESA_NO_CONFIGURADA': {
    codigo: 'EMPRESA_NO_CONFIGURADA',
    mensaje: 'Empresa no configurada',
    descripcion: 'La empresa solicitada no existe en el sistema o no ha sido configurada correctamente.',
    solucion: 'Verifica que el slug de la empresa sea correcto o contacta al administrador del sistema.',
    tipo: 'error'
  },
  'EMPRESA_INACTIVA': {
    codigo: 'EMPRESA_INACTIVA',
    mensaje: 'Empresa inactiva',
    descripcion: 'La empresa existe pero está marcada como inactiva en el sistema.',
    solucion: 'Contacta al administrador para activar la empresa o verifica su estado.',
    tipo: 'warning'
  },
  'API_KEY_INVALIDA': {
    codigo: 'API_KEY_INVALIDA',
    mensaje: 'API Key inválida',
    descripcion: 'La API Key proporcionada no coincide con la configurada para esta empresa.',
    solucion: 'Verifica que estés usando la API Key correcta para esta empresa.',
    tipo: 'error'
  },
  'PERMISO_INSUFICIENTE': {
    codigo: 'PERMISO_INSUFICIENTE',
    mensaje: 'Permisos insuficientes',
    descripcion: 'La empresa no tiene los permisos necesarios para realizar esta operación.',
    solucion: 'Contacta al administrador para solicitar los permisos adicionales.',
    tipo: 'warning'
  },
  'CONFIGURACION_QR_INCOMPLETA': {
    codigo: 'CONFIGURACION_QR_INCOMPLETA',
    mensaje: 'Configuración QR incompleta',
    descripcion: 'La empresa no tiene configurados todos los parámetros necesarios para generar códigos QR.',
    solucion: 'Completa la configuración de QR en el panel de administración.',
    tipo: 'warning'
  }
};

// Función para obtener configuración de error por código
export function getErrorConfig(codigo: string): ErrorConfig | null {
  return erroresEmpresa[codigo] || null;
}

// Función para crear un mensaje de error personalizado
export function crearMensajeError(
  codigo: string, 
  empresaSlug?: string, 
  detallesAdicionales?: string
): string {
  const error = getErrorConfig(codigo);
  
  if (!error) {
    return 'Error desconocido del sistema';
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

// Función para validar si un error es crítico
export function esErrorCritico(codigo: string): boolean {
  const error = getErrorConfig(codigo);
  return error?.tipo === 'error';
}

// Función para obtener todos los errores de un tipo específico
export function getErroresPorTipo(tipo: 'error' | 'warning' | 'info'): ErrorConfig[] {
  return Object.values(erroresEmpresa).filter(error => error.tipo === tipo);
}
