import { BaseIntegrationService } from './IntegrationService';
import type { IntegrationService } from './IntegrationService';
import type { EmpresaConfig } from '../../config/empresas';
import type { ServerResponse } from '../../types/api';
import type {
  DeudaAguaSchema,
  DeudaServicioSchema,
  DeudasResponse,
  AbonadoSchema,
  PagoServiciosRequest,
  PagoServiciosResponse,
  PagoAguaRequest,
  ListaAbonadosParams,
  ListaAbonadosResponse
} from '../../types/empsaat';

/**
 * Interfaz específica para la integración con EMPSAAT
 */
export interface EmpsaatIntegrationService extends IntegrationService {
  /**
   * Obtiene las deudas de un abonado
   */
  getDeudasByAbonado(abonado: number): Promise<ServerResponse<DeudasResponse>>;

  /**
   * Procesa el pago de servicios para un abonado
   */
  procesarPagoServicios(abonado: number, datos: PagoServiciosRequest): Promise<ServerResponse<PagoServiciosResponse>>;

  /**
   * Procesa el pago de facturas de agua para un abonado
   */
  procesarPagoAgua(abonado: number, datos: PagoAguaRequest[]): Promise<ServerResponse<DeudasResponse>>;

  /**
   * Obtiene lista de abonados según parámetros
   */
  getAbonados(params: ListaAbonadosParams): Promise<ServerResponse<ListaAbonadosResponse>>;

  /**
   * Obtiene detalle de un abonado específico
   */
  getAbonadoById(abonado: number): Promise<ServerResponse<AbonadoSchema>>;
}

/**
 * Implementación de la integración con EMPSAAT
 */
export class EmpsaatIntegration extends BaseIntegrationService implements EmpsaatIntegrationService {
  private apiBaseUrl: string;
  private apiHeaders: HeadersInit;

  constructor(empresaConfig: EmpresaConfig) {
    super(empresaConfig);
    // Configuración específica para EMPSAAT
    // La URL base se obtiene directamente de la configuración de la empresa
    this.apiBaseUrl = empresaConfig.apiBaseUrl;
    this.apiHeaders = {
      'Content-Type': 'application/json',
      'api-key': empresaConfig.apiKey
    };
  }

  /**
   * Verifica la disponibilidad del servicio EMPSAAT
   */
  async checkServiceStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/`, {
        method: 'GET',
        headers: this.apiHeaders
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error al verificar estado del servicio EMPSAAT:', error);
      return false;
    }
  }

  /**
   * Obtiene las deudas de un abonado específico
   */
  async getDeudasByAbonado(abonado: number): Promise<ServerResponse<DeudasResponse>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/deudas/${abonado}`, {
        method: 'GET',
        headers: this.apiHeaders
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return this.createErrorResponse(
          errorData?.message || `Error al obtener deudas del abonado ${abonado}`, 
          'ERROR_CONSULTA_DEUDAS'
        );
      }

      const data = await response.json() as DeudasResponse;
      return this.createSuccessResponse(data, 'Deudas obtenidas correctamente');
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Procesa el pago de servicios para un abonado
   */
  async procesarPagoServicios(abonado: number, datos: PagoServiciosRequest): Promise<ServerResponse<PagoServiciosResponse>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/deudas/${abonado}/factura-servicios`, {
        method: 'POST',
        headers: this.apiHeaders,
        body: JSON.stringify(datos)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return this.createErrorResponse(
          errorData?.message || `Error al procesar pago de servicios para el abonado ${abonado}`, 
          'ERROR_PAGO_SERVICIOS'
        );
      }

      const data = await response.json() as PagoServiciosResponse;
      return this.createSuccessResponse(data, 'Pago de servicios procesado correctamente');
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Procesa el pago de facturas de agua para un abonado
   */
  async procesarPagoAgua(abonado: number, datos: PagoAguaRequest[]): Promise<ServerResponse<DeudasResponse>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/deudas/${abonado}/factura-agua`, {
        method: 'POST',
        headers: this.apiHeaders,
        body: JSON.stringify(datos)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return this.createErrorResponse(
          errorData?.message || `Error al procesar pago de agua para el abonado ${abonado}`, 
          'ERROR_PAGO_AGUA'
        );
      }

      const data = await response.json() as DeudasResponse;
      return this.createSuccessResponse(data, 'Pago de agua procesado correctamente');
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Obtiene lista de abonados según parámetros
   */
  async getAbonados(params: ListaAbonadosParams): Promise<ServerResponse<ListaAbonadosResponse>> {
    try {
      // Construir URL con query params
      const queryParams = new URLSearchParams();
      queryParams.append('limit', params.limit.toString());
      
      if (params.offset !== undefined) {
        queryParams.append('offset', params.offset.toString());
      }
      
      if (params.abonado !== undefined) {
        queryParams.append('abonado', params.abonado.toString());
      }
      
      if (params.search !== undefined) {
        queryParams.append('search', params.search);
      }

      const response = await fetch(`${this.apiBaseUrl}/abonados/?${queryParams}`, {
        method: 'GET',
        headers: this.apiHeaders
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return this.createErrorResponse(
          errorData?.message || 'Error al obtener lista de abonados', 
          'ERROR_CONSULTA_ABONADOS'
        );
      }

      const data = await response.json() as ListaAbonadosResponse;
      return this.createSuccessResponse(data, 'Lista de abonados obtenida correctamente');
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Obtiene detalle de un abonado específico
   */
  async getAbonadoById(abonado: number): Promise<ServerResponse<AbonadoSchema>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/abonados/${abonado}`, {
        method: 'GET',
        headers: this.apiHeaders
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return this.createErrorResponse(
          errorData?.message || `Error al obtener detalles del abonado ${abonado}`, 
          'ERROR_CONSULTA_ABONADO'
        );
      }

      const data = await response.json() as AbonadoSchema;
      return this.createSuccessResponse(data, 'Detalles del abonado obtenidos correctamente');
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}
