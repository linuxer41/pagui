export interface EmpresaConfig {
  id: string;
  slug: string;
  nombre: string;
  logo: string;
  descripcion: string;
  color: string;
  gradiente: string;
  instrucciones: string;
  apiKey: string;
  apiBaseUrl: string; // URL base para la API de la empresa
  webUrl: string;
  paguiApikey: string;
  paguiBaseUrl: string; // URL base para la API de Pagui
  permisos: string[];
  activa: boolean;
  configuracionQR?: {
    montoMinimo: number;
    montoMaximo: number;
    tiempoExpiracion: number; // en minutos
    moneda: string;
  };
}

export const empresasConfig: Record<string, EmpresaConfig> = {
  'empsaat': {
    id: 'empsaat',
    slug: 'empsaat',
    nombre: 'Empresa de agua potable y alcantarillado de Tupiza',
    logo: 'empsaat.png',
    descripcion: 'Empsaat',
    color: 'rgb(var(--emerald))',
    gradiente: 'var(--gradient-emerald)',
    instrucciones: 'Ingresa tu código de cliente para ver tu cuenta pendiente',
    apiKey: 'ZSkzucwhnRv5L0UhIqd5uwgKG35JghJ69iHti20E',
    paguiApikey: 'pg_YMcIjsyOJsnTc4DaurDi3Hu3fOVjK0usiYrIp6U2',
    paguiBaseUrl: 'https://pagui-api.iathings.com',
    apiBaseUrl: 'https://api.empsaat.org.bo',
    webUrl: 'https://empsaat.org.bo',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: true,
    configuracionQR: {
      montoMinimo: 0.01,
      montoMaximo: 1000000,
      tiempoExpiracion: 30,
      moneda: 'BOB'
    }
  },
  'empresa-b': {
    id: 'empresa-b',
    slug: 'empresa-b',
    nombre: 'Farmacia Salud Total',
    logo: 'farmaciasalud.png',
    descripcion: 'Farmacia y productos de salud',
    color: 'rgb(var(--primary))',
    gradiente: 'var(--gradient-primary)',
    instrucciones: 'Busca tu receta médica con tu código de cliente',
    apiKey: 'pk_live_farmacia_salud_total_2024',
    paguiApikey: 'pg_YMcIjsyOJsnTc4DaurDi3Hu3fOVjK0usiYrIp6U2',
    paguiBaseUrl: 'https://pagui-api.iathings.com',
    apiBaseUrl: 'https://api.farmaciasalud.com/v1',
    webUrl: 'https://farmaciasalud.com',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: true,
    configuracionQR: {
      montoMinimo: 5,
      montoMaximo: 500,
      tiempoExpiracion: 60,
      moneda: 'BOB'
    }
  },
  'empresa-c': {
    id: 'empresa-c',
    slug: 'empresa-c',
    nombre: 'Taller Mecánico Rápido',
    logo: 'tallermecanico.png',
    descripcion: 'Servicios automotrices y mantenimiento',
    color: 'rgb(var(--accent))',
    gradiente: 'var(--gradient-accent)',
    instrucciones: 'Consulta el estado de tu vehículo con tu código',
    apiKey: 'pk_live_taller_mecanico_rapido_2024',
    paguiApikey: 'pg_YMcIjsyOJsnTc4DaurDi3Hu3fOVjK0usiYrIp6U2',
    paguiBaseUrl: 'https://pagui-api.iathings.com',
    apiBaseUrl: 'https://api.tallermecanico.com/v1',
    webUrl: 'https://tallermecanico.com',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: true,
    configuracionQR: {
      montoMinimo: 50,
      montoMaximo: 2000,
      tiempoExpiracion: 120,
      moneda: 'BOB'
    }
  },
  'empresa-d': {
    id: 'empresa-d',
    slug: 'empresa-d',
    nombre: 'Supermercado Mega',
    logo: 'supermercado.png',
    descripcion: 'Supermercado con productos de primera necesidad',
    color: 'rgb(var(--blue))',
    gradiente: 'var(--gradient-blue)',
    instrucciones: 'Consulta tu factura pendiente con tu código de cliente',
    apiKey: 'pk_live_supermercado_mega_2024',
    paguiApikey: 'pg_YMcIjsyOJsnTc4DaurDi3Hu3fOVjK0usiYrIp6U2',
    paguiBaseUrl: 'https://pagui-api.iathings.com',
    apiBaseUrl: 'https://api.supermercado.com/v1',
    webUrl: 'https://supermercado.com',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: false, // Empresa desactivada
    configuracionQR: {
      montoMinimo: 20,
      montoMaximo: 1500,
      tiempoExpiracion: 45,
      moneda: 'BOB'
    }
  }
};

// Función para obtener configuración de empresa por slug
export function getEmpresaConfig(slug: string): EmpresaConfig | null {
  const empresa = empresasConfig[slug];
  
  if (!empresa) {
    return null;
  }
  
  if (!empresa.activa) {
    return null;
  }
  
  return empresa;
}

// Función para verificar si una empresa está configurada y activa
export function isEmpresaConfigurada(slug: string): boolean {
  const empresa = getEmpresaConfig(slug);
  return empresa !== null;
}

// Función para obtener todas las empresas activas
export function getEmpresasActivas(): EmpresaConfig[] {
  return Object.values(empresasConfig).filter(empresa => empresa.activa);
}

// Función para validar API Key de una empresa
export function validarApiKey(slug: string, apiKey: string): boolean {
  const empresa = getEmpresaConfig(slug);
  return empresa?.apiKey === apiKey;
}

// Función para verificar permisos de una empresa
export function tienePermiso(slug: string, permiso: string): boolean {
  const empresa = getEmpresaConfig(slug);
  return empresa?.permisos.includes(permiso) || false;
}

// Función para obtener configuración QR de una empresa
export function getConfiguracionQR(slug: string) {
  const empresa = getEmpresaConfig(slug);
  return empresa?.configuracionQR || null;
}

// Función para obtener configuración de Pagui de una empresa
export function getConfiguracionPagui(slug: string) {
  const empresa = getEmpresaConfig(slug);
  return {
    apiKey: empresa?.paguiApikey || null,
    baseUrl: empresa?.paguiBaseUrl || null
  };
}
