import { 
  getEmpresaConfig, 
  isEmpresaConfigurada, 
  validarApiKey, 
  tienePermiso,
  getConfiguracionQR
} from '../config/empresas';
import type { EmpresaConfig } from '../config/empresas';
import { 
  crearMensajeError 
} from '../config/errores';
import type { ErrorConfig } from '../config/errores';

export interface ResultadoValidacion {
  valido: boolean;
  empresa?: EmpresaConfig;
  error?: ErrorConfig;
  mensaje: string;
}

export interface ResultadoPermiso {
  tienePermiso: boolean;
  empresa?: EmpresaConfig;
  error?: ErrorConfig;
  mensaje: string;
}

/**
 * Valida si una empresa está configurada y activa
 */
export function validarEmpresa(slug: string): ResultadoValidacion {
  if (!slug || typeof slug !== 'string') {
    return {
      valido: false,
      error: {
        codigo: 'SLUG_INVALIDO',
        mensaje: 'Slug de empresa inválido',
        descripcion: 'El slug proporcionado no es válido',
        solucion: 'Proporciona un slug válido',
        tipo: 'error'
      },
      mensaje: 'Slug de empresa inválido'
    };
  }

  const empresa = getEmpresaConfig(slug);
  
  if (!empresa) {
    return {
      valido: false,
      error: {
        codigo: 'EMPRESA_NO_CONFIGURADA',
        mensaje: 'Empresa no configurada',
        descripcion: `La empresa con slug '${slug}' no existe en el sistema`,
        solucion: 'Verifica que el slug sea correcto o contacta al administrador',
        tipo: 'error'
      },
      mensaje: crearMensajeError('EMPRESA_NO_CONFIGURADA', slug)
    };
  }

  return {
    valido: true,
    empresa,
    mensaje: `Empresa ${empresa.nombre} validada correctamente`
  };
}

/**
 * Valida la API Key de una empresa
 */
export function validarApiKeyEmpresa(slug: string, apiKey: string): ResultadoValidacion {
  const validacionEmpresa = validarEmpresa(slug);
  
  if (!validacionEmpresa.valido) {
    return validacionEmpresa;
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return {
      valido: false,
      error: {
        codigo: 'API_KEY_INVALIDA',
        mensaje: 'API Key inválida',
        descripcion: 'La API Key proporcionada no es válida',
        solucion: 'Proporciona una API Key válida',
        tipo: 'error'
      },
      mensaje: 'API Key inválida'
    };
  }

  const esValida = validarApiKey(slug, apiKey);
  
  if (!esValida) {
    return {
      valido: false,
      empresa: validacionEmpresa.empresa,
      error: {
        codigo: 'API_KEY_INVALIDA',
        mensaje: 'API Key inválida',
        descripcion: `La API Key proporcionada no coincide con la configurada para ${validacionEmpresa.empresa?.nombre}`,
        solucion: 'Verifica que estés usando la API Key correcta',
        tipo: 'error'
      },
      mensaje: crearMensajeError('API_KEY_INVALIDA', slug)
    };
  }

  return {
    valido: true,
    empresa: validacionEmpresa.empresa,
    mensaje: `API Key validada correctamente para ${validacionEmpresa.empresa?.nombre}`
  };
}

/**
 * Verifica si una empresa tiene un permiso específico
 */
export function verificarPermisoEmpresa(
  slug: string, 
  apiKey: string, 
  permiso: string
): ResultadoPermiso {
  const validacion = validarApiKeyEmpresa(slug, apiKey);
  
  if (!validacion.valido) {
    return {
      tienePermiso: false,
      error: validacion.error,
      mensaje: validacion.mensaje
    };
  }

  const tieneElPermiso = tienePermiso(slug, permiso);
  
  if (!tieneElPermiso) {
    return {
      tienePermiso: false,
      empresa: validacion.empresa,
      error: {
        codigo: 'PERMISO_INSUFICIENTE',
        mensaje: 'Permisos insuficientes',
        descripcion: `La empresa ${validacion.empresa?.nombre} no tiene el permiso '${permiso}'`,
        solucion: 'Contacta al administrador para solicitar el permiso',
        tipo: 'warning'
      },
      mensaje: crearMensajeError('PERMISO_INSUFICIENTE', slug, `Permiso requerido: ${permiso}`)
    };
  }

  return {
    tienePermiso: true,
    empresa: validacion.empresa,
    mensaje: `Permiso '${permiso}' verificado para ${validacion.empresa?.nombre}`
  };
}

/**
 * Obtiene la configuración QR de una empresa con validación
 */
export function obtenerConfiguracionQREmpresa(
  slug: string, 
  apiKey: string
): ResultadoValidacion & { configuracionQR?: any } {
  const validacion = validarApiKeyEmpresa(slug, apiKey);
  
  if (!validacion.valido) {
    return validacion;
  }

  const configuracionQR = getConfiguracionQR(slug);
  
  if (!configuracionQR) {
    return {
      valido: false,
      empresa: validacion.empresa,
      error: {
        codigo: 'CONFIGURACION_QR_INCOMPLETA',
        mensaje: 'Configuración QR incompleta',
        descripcion: `La empresa ${validacion.empresa?.nombre} no tiene configurados los parámetros QR`,
        solucion: 'Completa la configuración QR en el panel de administración',
        tipo: 'warning'
      },
      mensaje: crearMensajeError('CONFIGURACION_QR_INCOMPLETA', slug)
    };
  }

  return {
    valido: true,
    empresa: validacion.empresa,
    configuracionQR,
    mensaje: `Configuración QR obtenida para ${validacion.empresa?.nombre}`
  };
}

/**
 * Valida los parámetros de generación de QR según la configuración de la empresa
 */
export function validarParametrosQR(
  slug: string,
  apiKey: string,
  monto: number,
  descripcion: string
): ResultadoValidacion {
  const configuracion = obtenerConfiguracionQREmpresa(slug, apiKey);
  
  if (!configuracion.valido) {
    return configuracion;
  }

  const { configuracionQR } = configuracion;
  
  // Validar monto mínimo
  if (monto < configuracionQR.montoMinimo) {
    return {
      valido: false,
      empresa: configuracion.empresa,
      error: {
        codigo: 'MONTO_INSUFICIENTE',
        mensaje: 'Monto insuficiente',
        descripcion: `El monto ${monto} es menor al mínimo permitido (${configuracionQR.montoMinimo})`,
        solucion: `El monto mínimo para esta empresa es ${configuracionQR.montoMinimo} ${configuracionQR.moneda}`,
        tipo: 'warning'
      },
      mensaje: `Monto mínimo requerido: ${configuracionQR.montoMinimo} ${configuracionQR.moneda}`
    };
  }

  // Validar monto máximo
  if (monto > configuracionQR.montoMaximo) {
    return {
      valido: false,
      empresa: configuracion.empresa,
      error: {
        codigo: 'MONTO_EXCESIVO',
        mensaje: 'Monto excesivo',
        descripcion: `El monto ${monto} excede el máximo permitido (${configuracionQR.montoMaximo})`,
        solucion: `El monto máximo para esta empresa es ${configuracionQR.montoMaximo} ${configuracionQR.moneda}`,
        tipo: 'warning'
      },
      mensaje: `Monto máximo permitido: ${configuracionQR.montoMaximo} ${configuracionQR.moneda}`
    };
  }

  // Validar descripción
  if (!descripcion || descripcion.trim().length === 0) {
    return {
      valido: false,
      empresa: configuracion.empresa,
      error: {
        codigo: 'DESCRIPCION_REQUERIDA',
        mensaje: 'Descripción requerida',
        descripcion: 'La descripción del cobro es obligatoria',
        solucion: 'Proporciona una descripción válida para el cobro',
        tipo: 'warning'
      },
      mensaje: 'La descripción del cobro es obligatoria'
    };
  }

  return {
    valido: true,
    empresa: configuracion.empresa,
    mensaje: `Parámetros QR validados correctamente para ${configuracion.empresa?.nombre}`
  };
}

/**
 * Función helper para crear respuestas de error consistentes
 */
export function crearRespuestaError(
  codigo: string,
  slug?: string,
  detalles?: string
): ResultadoValidacion {
  const error = {
    codigo,
    mensaje: 'Error del sistema',
    descripcion: 'Ocurrió un error inesperado',
    solucion: 'Contacta al soporte técnico',
    tipo: 'error' as const
  };

  return {
    valido: false,
    error,
    mensaje: crearMensajeError(codigo, slug, detalles)
  };
}
