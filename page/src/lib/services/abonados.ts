import { IntegrationFactory } from './integration/IntegrationFactory';
import type { ServerResponse } from '../types/api';
import type { 
  AbonadoSchema,
  ListaAbonadosParams,
  ListaAbonadosResponse
} from '../types/empsaat';

/**
 * Servicio para gestionar operaciones relacionadas con abonados
 */
export class AbonadosService {
  /**
   * Obtiene lista de abonados según filtros
   * 
   * @param empresaSlug Slug de la empresa
   * @param params Parámetros para filtrar abonados
   * @param apiKey API Key para autenticación
   */
  static async obtenerAbonados(
    empresaSlug: string,
    params: ListaAbonadosParams,
    apiKey: string
  ): Promise<ServerResponse<ListaAbonadosResponse>> {
    try {
      // Validar que el slug de empresa y el apiKey sean cadenas
      if (typeof empresaSlug !== 'string' || typeof apiKey !== 'string') {
        return {
          success: false,
          error: 'Parámetros inválidos',
          codigo: 'PARAMETROS_INVALIDOS'
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

          // Obtener abonados a través del servicio de integración
          return await empsaatService.getAbonados(params);

        // Añadir casos para otras empresas cuando se implementen
        default:
          return {
            success: false,
            error: `No hay integración disponible para la empresa: ${empresaSlug}`,
            codigo: 'INTEGRACION_NO_DISPONIBLE'
          };
      }
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
   * @param empresaSlug Slug de la empresa
   * @param abonado Número de abonado
   * @param apiKey API Key para autenticación
   */
  static async obtenerAbonadoPorId(
    empresaSlug: string,
    abonado: number,
    apiKey: string
  ): Promise<ServerResponse<AbonadoSchema>> {
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

          // Obtener abonado a través del servicio de integración
          return await empsaatService.getAbonadoById(abonado);

        // Añadir casos para otras empresas cuando se implementen
        default:
          return {
            success: false,
            error: `No hay integración disponible para la empresa: ${empresaSlug}`,
            codigo: 'INTEGRACION_NO_DISPONIBLE'
          };
      }
    } catch (error) {
      console.error('Error al obtener abonado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }
}
