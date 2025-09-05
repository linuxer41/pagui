// Tipos para la API de integración EMPSAAT
import type { ServerResponse } from './api';

// Esquema de Deuda de Agua
export interface DeudaAguaSchema {
  factura: number;
  emision: Date | string | number;
  lectura: number;
  consumoM3: number;
  importeFactura: number;
  fechaPago?: Date | string | number | null;
  cufFactura: string;
  abonado: number;
}

// Esquema de Deuda de Servicio
export interface DeudaServicioSchema {
  noSolicitud: number;
  fecha?: Date | string | number;
  descripcion: string;
  costo: number;
}

// Esquema para los totales de deuda
export interface TotalDeudaSchema {
  totalAgua: number;
  totalServicios: number;
  totalDeuda: number;
}

// Esquema de Abonado
export interface AbonadoSchema {
  abonado: number;
  nombre: string;
  nit: number;
  medidor: string;
  zona: string;
  calle: string;
  num: string;
  categoria: string;
  ley1886: boolean;
  estado: string;
}

// Esquema de Cliente
export interface ClienteSchema {
  cliente: string;
  documento: string;
  razon: string;
  nit: number;
  nacimiento: Date | string | number;
  telefono?: string;
  empleado?: string;
  correo?: string;
}

// Respuesta para consultar deudas
export interface DeudasResponse {
  deudasAgua: DeudaAguaSchema[];
  deudasServicios: DeudaServicioSchema[];
  totales: TotalDeudaSchema;
}

// Solicitud para procesar pago de servicios
export interface PagoServiciosRequest {
  total: number;
  usuario: string;
  nit: string;
  idServicios: number[];
}

// Respuesta al procesar pago de servicios
export interface PagoServiciosResponse {
  message: string;
  data: {
    cuf: string;
    numeroFactura: string;
    total: number;
    servicios: DeudaServicioSchema[];
  };
}

// Solicitud para procesar pago de agua
export interface PagoAguaRequest {
  cuf: string;
}[]

// Parámetros para obtener lista de abonados
export interface ListaAbonadosParams {
  limit: number;
  offset?: number;
  abonado?: number;
  search?: string;
}

// Respuesta de lista de abonados
export interface ListaAbonadosResponse {
  data: AbonadoSchema[];
  count: number;
}

// Adaptar respuestas al formato general de la aplicación
export interface EmpsaatApiResponse<T> extends ServerResponse<T> {
  // Campos adicionales específicos de EMPSAAT si son necesarios
}
