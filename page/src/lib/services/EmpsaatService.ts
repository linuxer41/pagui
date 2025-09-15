import type { ServerResponse } from '../types/api';
import type { 
  DeudasResponse, 
  DeudasApiResponse,
  PagoServiciosRequest, 
  PagoServiciosResponse, 
  PagoAguaRequest, 
  AbonadoSchema,
  CrearTransaccionRequest,
  CompletarTransaccionRequest,
  TransaccionResponse
} from '../types/empsaat';
import type { EmpresaConfig } from '../config/empresas';

/**
 * Servicio para EMPSAAT
 * Implementa el nuevo flujo de transacciones de dos pasos:
 * 1. Crear Transacción - Reserva las deudas para pago
 * 2. Completar Transacción - Procesa el pago y marca las deudas como pagadas
 * 
 * Flujo recomendado:
 * 1. buscarDeudasPorCriterio() - Buscar deudas del cliente
 * 2. crearTransaccion() - Crear transacción con deudas seleccionadas
 * 3. completarTransaccion() - Procesar el pago
 * 4. obtenerHistorialTransacciones() - Verificar historial (opcional)
 */
export class EmpsaatService {
  private empresaConfig: EmpresaConfig;

  constructor(empresaConfig: EmpresaConfig) {
    this.empresaConfig = empresaConfig;
  }
  
  /**
   * Realiza una llamada HTTP simple a la API de EMPSAAT
   */
  private async callApi<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    body?: any
  ): Promise<ServerResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'api-key': this.empresaConfig.apiKey
    };

    const response = await fetch(`${this.empresaConfig.apiBaseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.log('errorData', JSON.stringify(errorData, null, 2));
      throw new Error(errorData?.message || `Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Busca deudas por criterio (nombre, documento, abonado)
   * Usa el nuevo endpoint /deudas con parámetros de consulta
   */
  async buscarDeudasPorCriterio(
    keyword: string, 
    type: 'nombre' | 'documento' | 'abonado'
  ): Promise<ServerResponse<DeudasResponse>> {
    const params = new URLSearchParams({
      keyword: keyword.trim(),
      type
    });
    
    return this.callApi<DeudasResponse>(`/deudas?${params}`, 'GET');
  }

  /**
   * Crea una nueva transacción con las deudas seleccionadas
   * Endpoint: POST /deudas/{abonado}/transaction
   */
  async crearTransaccion(
    abonado: number,
    datos: CrearTransaccionRequest
  ): Promise<ServerResponse<TransaccionResponse>> {
    return this.callApi<TransaccionResponse>(
      `/deudas/${abonado}/transaction`,
      'POST',
      datos
    );
  }

  /**
   * Completa una transacción pendiente procesando el pago
   * Endpoint: POST /deudas/transaction/complete
   */
  async completarTransaccion(
    datos: CompletarTransaccionRequest
  ): Promise<ServerResponse<TransaccionResponse>> {
    return this.callApi<TransaccionResponse>(
      '/deudas/transaction/complete',
      'POST',
      datos
    );
  }

  /**
   * Obtiene el historial de transacciones de un abonado
   * Endpoint: GET /deudas/{abonado}/transactions
   */
  async obtenerHistorialTransacciones(
    abonado: number
  ): Promise<ServerResponse<TransaccionResponse[]>> {
    return this.callApi<TransaccionResponse[]>(
      `/deudas/${abonado}/transactions`,
      'GET'
    );
  }

  // Métodos legacy - mantenidos para compatibilidad hacia atrás
  /**
   * @deprecated Usar crearTransaccion() y completarTransaccion() en su lugar
   * Procesa pago de facturas de agua
   */
  async procesarPagoAgua(
    abonado: number, 
    facturas: PagoAguaRequest[]
  ): Promise<ServerResponse<DeudasResponse>> {
    return this.callApi<DeudasResponse>(
      `/deudas/${abonado}/factura-agua`, 
      'POST', 
      facturas
    );
  }

  /**
   * @deprecated Usar crearTransaccion() y completarTransaccion() en su lugar
   * Procesa pago de servicios
   */
  async procesarPagoServicios(
    abonado: number, 
    datos: PagoServiciosRequest
  ): Promise<ServerResponse<PagoServiciosResponse>> {
    return this.callApi<PagoServiciosResponse>(
      `/deudas/${abonado}/factura-servicios`, 
      'POST', 
      datos
    );
  }

  /**
   * Obtiene información de un abonado
   */
  async obtenerAbonadoPorId(
    abonado: number
  ): Promise<ServerResponse<AbonadoSchema>> {
    return this.callApi<AbonadoSchema>(`/abonados/${abonado}`, 'GET');
  }
}
