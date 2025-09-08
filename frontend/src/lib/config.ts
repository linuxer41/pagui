// Configuración global de la aplicación

// API URL - Se obtiene de las variables de entorno o se usa un valor por defecto
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Configuración de la aplicación
export const APP_CONFIG = {
  // Nombre de la aplicación
  appName: 'Pagui',
  
  // Versión de la aplicación
  version: '1.0.0',
  
  // Año de copyright
  copyrightYear: new Date().getFullYear(),
  
  // Configuración de paginación
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  },
  
  // Configuración de moneda
  currency: {
    code: 'BOB',
    symbol: 'Bs.',
    locale: 'es-BO'
  },
  
  // Configuración de fechas
  dateFormat: {
    short: 'dd/MM/yyyy',
    long: 'dd/MM/yyyy HH:mm:ss',
    display: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  },
  
  // Configuración de QR
  qr: {
    defaultDuration: 24, // horas
    defaultSingleUse: true,
    defaultModifyAmount: false
  }
};

// Exportar configuración
export default APP_CONFIG; 