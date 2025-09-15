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
  fecha: string; // Siempre viene como string en formato ISO
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
  nit: number;
  nombre: string;
  ci: string;
  medidor: string;
  zona: string;
  direccion: string;
  categoria: string;
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
  deudas: Array<{
    abonado: AbonadoSchema;
    deudasAgua: DeudaAguaSchema[];
    deudasServicios: DeudaServicioSchema[];
    totales: TotalDeudaSchema;
  }>;
  totalGeneral: TotalDeudaSchema;
}

// Respuesta completa de la API (incluye status y type)
export interface DeudasApiResponse {
  type: 'success' | 'error';
  status: number;
  data: DeudasResponse;
}

// Esquema de Transacción
export interface TransaccionSchema {
  id: number;
  transactionId: string;
  subscriberNumber: number;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  metadata: {
    waterDebts: number[];
    serviceDebts: number[];
    waterTotal: number;
    serviceTotal: number;
    grandTotal: number;
  };
  createdAt: string;
  completedAt: string | null;
  userName: string;
  taxId: string;
  businessName: string;
  email: string;
}

// Solicitud para crear transacción
export interface CrearTransaccionRequest {
  taxId: string;
  businessName: string;
  email: string;
  waterDebts?: number[];
  serviceDebts?: number[];
}

// Solicitud para completar transacción
export interface CompletarTransaccionRequest {
  transactionId: string;
  paymentMethod: 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'cheque' | 'qr';
  amountPaid: number;
}

// Respuesta de transacción
export interface TransaccionResponse {
  id: number;
  transactionId: string;
  subscriberNumber: number;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  metadata: {
    waterDebts: number[];
    serviceDebts: number[];
    waterTotal: number;
    serviceTotal: number;
    grandTotal: number;
  };
  createdAt: string;
  completedAt: string | null;
  userName: string;
  taxId: string;
  businessName: string;
  email: string;
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
export interface EmpsaatApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  codigo?: string;
}
