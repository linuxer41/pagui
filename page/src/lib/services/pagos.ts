import { IntegrationFactory } from './integration/IntegrationFactory';
import type { ServerResponse } from '../types/api';
import type { 
  DeudasResponse, 
  PagoServiciosRequest, 
  PagoServiciosResponse,
  PagoAguaRequest 
} from '../types/empsaat';

/**
 * Servicio para gestionar operaciones relacionadas con pagos
 */
export class PagosService {
  /**
   * Procesa el pago de servicios para un abonado
   * 
   * @param empresaSlug Slug de la empresa
   * @param abonado Número de abonado
   * @param datos Datos del pago
   * @param apiKey API Key para autenticación
   */
  static async procesarPagoServicios(
    empresaSlug: string,
    abonado: number,
    datos: PagoServiciosRequest,
    apiKey: string
  ): Promise<ServerResponse<PagoServiciosResponse>> {
    try {
      // Validar que el slug de empresa y el apiKey sean cadenas
      if (typeof empresaSlug !== 'string' || typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'Parámetros inválidos',
          codigo: 'PARAMETROS_INVALIDOS'
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
      switch (empresaSlug) {
        case 'empsaat':
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

        // Añadir casos para otras empresas cuando se implementen
        default:
          return {
            success: false,
            error: `No hay integración disponible para la empresa: ${empresaSlug}`,
            codigo: 'INTEGRACION_NO_DISPONIBLE'
          };
      }
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
   * @param empresaSlug Slug de la empresa
   * @param abonado Número de abonado
   * @param datos Lista de CUFs a pagar
   * @param apiKey API Key para autenticación
   */
  static async procesarPagoAgua(
    empresaSlug: string,
    abonado: number,
    datos: PagoAguaRequest[],
    apiKey: string
  ): Promise<ServerResponse<DeudasResponse>> {
    try {
      // Validar que el slug de empresa y el apiKey sean cadenas
      if (typeof empresaSlug !== 'string' || typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'Parámetros inválidos',
          codigo: 'PARAMETROS_INVALIDOS'
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
      switch (empresaSlug) {
        case 'empsaat':
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

        // Añadir casos para otras empresas cuando se implementen
        default:
          return {
            success: false,
            error: `No hay integración disponible para la empresa: ${empresaSlug}`,
            codigo: 'INTEGRACION_NO_DISPONIBLE'
          };
      }
    } catch (error) {
      console.error('Error al procesar pago de agua:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }
}
