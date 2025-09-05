import { IntegrationFactory } from './integration/IntegrationFactory';
import type { ServerResponse } from '../types/api';
import type { 
  DeudasResponse,
  PagoServiciosRequest,
  PagoServiciosResponse,
  PagoAguaRequest,
  AbonadoSchema,
  ListaAbonadosParams,
  ListaAbonadosResponse
} from '../types/empsaat';

/**
 * Servicio unificado para operaciones con EMPSAAT
 * Consolida funcionalidades de deudas, pagos y abonados
 */
export class EmpsaatService {
  private static readonly EMPRESA_SLUG = 'empsaat';

  /**
   * Obtiene las deudas de un abonado
   * 
   * @param abonado Número de abonado
   * @param apiKey API Key para autenticación
   */
  static async obtenerDeudas(
    abonado: number,
    apiKey: string
  ): Promise<ServerResponse<DeudasResponse>> {
    try {
      // Validar que el apiKey sea cadena
      if (typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Validar que el abonado sea un número
      if (isNaN(abonado)) {
        return {
          success: false,
          error: 'El número de abonado debe ser un valor numérico',
          codigo: 'ABONADO_INVALIDO'
        };
      }

      // Obtener la integración correspondiente
      const empsaatService = IntegrationFactory.getEmpsaatIntegration();
      if (!empsaatService) {
        return {
          success: false,
          error: 'Servicio de integración no disponible',
          codigo: 'SERVICIO_NO_DISPONIBLE'
        };
      }

      // Validar API Key
      const esApiKeyValida = await empsaatService.validateApiKey(apiKey);
      if (!esApiKeyValida) {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Obtener deudas a través del servicio de integración
      return await empsaatService.getDeudasByAbonado(abonado);
    } catch (error) {
      console.error('Error al obtener deudas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }

  /**
   * Procesa el pago de servicios para un abonado
   * 
   * @param abonado Número de abonado
   * @param datos Datos del pago
   * @param apiKey API Key para autenticación
   */
  static async procesarPagoServicios(
    abonado: number,
    datos: PagoServiciosRequest,
    apiKey: string
  ): Promise<ServerResponse<PagoServiciosResponse>> {
    try {
      // Validar que el apiKey sea cadena
      if (typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Validar que el abonado sea un número
      if (isNaN(abonado)) {
        return {
          success: false,
          error: 'El número de abonado debe ser un valor numérico',
          codigo: 'ABONADO_INVALIDO'
        };
      }

      // Obtener la integración correspondiente
      const empsaatService = IntegrationFactory.getEmpsaatIntegration();
      if (!empsaatService) {
        return {
          success: false,
          error: 'Servicio de integración no disponible',
          codigo: 'SERVICIO_NO_DISPONIBLE'
        };
      }

      // Validar API Key
      const esApiKeyValida = await empsaatService.validateApiKey(apiKey);
      if (!esApiKeyValida) {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Procesar pago a través del servicio de integración
      return await empsaatService.procesarPagoServicios(abonado, datos);
    } catch (error) {
      console.error('Error al procesar pago de servicios:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }

  /**
   * Procesa el pago de facturas de agua para un abonado
   * 
   * @param abonado Número de abonado
   * @param datos Lista de CUFs a pagar
   * @param apiKey API Key para autenticación
   */
  static async procesarPagoAgua(
    abonado: number,
    datos: PagoAguaRequest[],
    apiKey: string
  ): Promise<ServerResponse<DeudasResponse>> {
    try {
      // Validar que el apiKey sea cadena
      if (typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Validar que el abonado sea un número
      if (isNaN(abonado)) {
        return {
          success: false,
          error: 'El número de abonado debe ser un valor numérico',
          codigo: 'ABONADO_INVALIDO'
        };
      }

      // Validar datos de pago
      if (!Array.isArray(datos) || datos.length === 0) {
        return {
          success: false,
          error: 'Debe proporcionar al menos un CUF para procesar el pago',
          codigo: 'DATOS_PAGO_INVALIDOS'
        };
      }

      // Obtener la integración correspondiente
      const empsaatService = IntegrationFactory.getEmpsaatIntegration();
      if (!empsaatService) {
        return {
          success: false,
          error: 'Servicio de integración no disponible',
          codigo: 'SERVICIO_NO_DISPONIBLE'
        };
      }

      // Validar API Key
      const esApiKeyValida = await empsaatService.validateApiKey(apiKey);
      if (!esApiKeyValida) {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Procesar pago a través del servicio de integración
      return await empsaatService.procesarPagoAgua(abonado, datos);
    } catch (error) {
      console.error('Error al procesar pago de agua:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }

  /**
   * Obtiene lista de abonados según filtros
   * 
   * @param params Parámetros para filtrar abonados
   * @param apiKey API Key para autenticación
   */
  static async obtenerAbonados(
    params: ListaAbonadosParams,
    apiKey: string
  ): Promise<ServerResponse<ListaAbonadosResponse>> {
    try {
      // Validar que el apiKey sea cadena
      if (typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Validar parámetros básicos
      if (!params || typeof params !== 'object' || isNaN(params.limit)) {
        return {
          success: false,
          error: 'Parámetros de consulta inválidos',
          codigo: 'PARAMETROS_CONSULTA_INVALIDOS'
        };
      }

      // Obtener la integración correspondiente
      const empsaatService = IntegrationFactory.getEmpsaatIntegration();
      if (!empsaatService) {
        return {
          success: false,
          error: 'Servicio de integración no disponible',
          codigo: 'SERVICIO_NO_DISPONIBLE'
        };
      }

      // Validar API Key
      const esApiKeyValida = await empsaatService.validateApiKey(apiKey);
      if (!esApiKeyValida) {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Obtener abonados a través del servicio de integración
      return await empsaatService.getAbonados(params);
    } catch (error) {
      console.error('Error al obtener abonados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }

  /**
   * Obtiene información detallada de un abonado específico
   * 
   * @param abonado Número de abonado
   * @param apiKey API Key para autenticación
   */
  static async obtenerAbonadoPorId(
    abonado: number,
    apiKey: string
  ): Promise<ServerResponse<AbonadoSchema>> {
    try {
      // Validar que el apiKey sea cadena
      if (typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Validar que el abonado sea un número
      if (isNaN(abonado)) {
        return {
          success: false,
          error: 'El número de abonado debe ser un valor numérico',
          codigo: 'ABONADO_INVALIDO'
        };
      }

      // Obtener la integración correspondiente
      const empsaatService = IntegrationFactory.getEmpsaatIntegration();
      if (!empsaatService) {
        return {
          success: false,
          error: 'Servicio de integración no disponible',
          codigo: 'SERVICIO_NO_DISPONIBLE'
        };
      }

      // Validar API Key
      const esApiKeyValida = await empsaatService.validateApiKey(apiKey);
      if (!esApiKeyValida) {
        return {
          success: false,
          error: 'API Key inválida',
          codigo: 'API_KEY_INVALIDA'
        };
      }

      // Obtener abonado a través del servicio de integración
      return await empsaatService.getAbonadoById(abonado);
    } catch (error) {
      console.error('Error al obtener abonado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }

  /**
   * Verifica si el servicio de EMPSAAT está disponible
   */
  static async verificarDisponibilidad(): Promise<boolean> {
    const empsaatService = IntegrationFactory.getEmpsaatIntegration();
    if (!empsaatService) {
      return false;
    }

    return await empsaatService.checkServiceStatus();
  }
}
