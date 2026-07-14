export interface EmpresaConfig {
  id: string
  slug: string
  nombre: string
  logo: string
  descripcion: string
  color: string
  gradiente: string
  instrucciones: string
  apiKey: string
  apiBaseUrl: string
  webUrl: string
  paguiApikey: string
  paguiBaseUrl: string
  permisos: string[]
  activa: boolean
  configuracionQR?: {
    montoMinimo: number
    montoMaximo: number
    tiempoExpiracion: number
    moneda: string
  }
}

import { PUBLIC_PAGUI_API_KEY, PUBLIC_PAGUI_API_URL } from '$env/static/public'

const PAGUI_API_KEY = PUBLIC_PAGUI_API_KEY || ''
const PAGUI_BASE_URL = PUBLIC_PAGUI_API_URL || 'http://localhost:3000'

export const empresasConfig: Record<string, EmpresaConfig> = {
  empsaat: {
    id: 'empsaat',
    slug: 'empsaat',
    nombre: 'Empresa de agua potable y alcantarillado de Tupiza',
    logo: 'empsaat.png',
    descripcion: 'Empsaat',
    color: 'rgb(var(--emerald))',
    gradiente: 'var(--gradient-emerald)',
    instrucciones: 'Ingresa tu código de cliente para ver tu cuenta pendiente',
    apiKey: '',
    apiBaseUrl: '',
    paguiApikey: PAGUI_API_KEY,
    paguiBaseUrl: PAGUI_BASE_URL,
    webUrl: 'https://empsaat.org.bo',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: true,
    configuracionQR: {
      montoMinimo: 0.01,
      montoMaximo: 1000000,
      tiempoExpiracion: 30,
      moneda: 'BOB',
    },
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
    apiKey: '',
    apiBaseUrl: '',
    paguiApikey: PAGUI_API_KEY,
    paguiBaseUrl: PAGUI_BASE_URL,
    webUrl: 'https://farmaciasalud.com',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: true,
    configuracionQR: {
      montoMinimo: 5,
      montoMaximo: 500,
      tiempoExpiracion: 60,
      moneda: 'BOB',
    },
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
    apiKey: '',
    apiBaseUrl: '',
    paguiApikey: PAGUI_API_KEY,
    paguiBaseUrl: PAGUI_BASE_URL,
    webUrl: 'https://tallermecanico.com',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: true,
    configuracionQR: {
      montoMinimo: 50,
      montoMaximo: 2000,
      tiempoExpiracion: 120,
      moneda: 'BOB',
    },
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
    apiKey: '',
    apiBaseUrl: '',
    paguiApikey: PAGUI_API_KEY,
    paguiBaseUrl: PAGUI_BASE_URL,
    webUrl: 'https://supermercado.com',
    permisos: ['qr_generate', 'qr_status', 'qr_cancel', 'qr_payments'],
    activa: false,
    configuracionQR: {
      montoMinimo: 20,
      montoMaximo: 1500,
      tiempoExpiracion: 45,
      moneda: 'BOB',
    },
  },
}

export function getEmpresaConfig(slug: string): EmpresaConfig | null {
  const empresa = empresasConfig[slug]
  if (!empresa || !empresa.activa) return null
  return empresa
}

export function isEmpresaConfigurada(slug: string): boolean {
  return getEmpresaConfig(slug) !== null
}

export function getEmpresasActivas(): EmpresaConfig[] {
  return Object.values(empresasConfig).filter((e) => e.activa)
}

export function getConfiguracionQR(slug: string) {
  return getEmpresaConfig(slug)?.configuracionQR || null
}

export function validarApiKey(slug: string, apiKey: string): boolean {
  const empresa = getEmpresaConfig(slug)
  return empresa?.apiKey === apiKey
}

export function tienePermiso(slug: string, permiso: string): boolean {
  const empresa = getEmpresaConfig(slug)
  return empresa?.permisos.includes(permiso) || false
}

export function getConfiguracionPagui(slug: string) {
  const empresa = getEmpresaConfig(slug)
  return {
    apiKey: empresa?.paguiApikey || null,
    baseUrl: empresa?.paguiBaseUrl || null,
  }
}
