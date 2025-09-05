import { IntegrationFactory } from './integration/IntegrationFactory';
import type { ServerResponse } from '../types/api';
import type { DeudasResponse } from '../types/empsaat';
import { crearRespuestaError } from '../utils/empresaUtils';

/**
 * Servicio para gestionar operaciones relacionadas con deudas
 */
export class DeudasService {
  /**
   * Obtiene las deudas de un abonado por empresa
   * 
   * @param empresaSlug Slug de la empresa
   * @param abonado Número de abonado
   * @param apiKey API Key para autenticación
   */
  static async obtenerDeudasAbonado(
    empresaSlug: string,
    abonado: number,
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

          // Obtener deudas a través del servicio de integración
          return await empsaatService.getDeudasByAbonado(abonado);

        // Añadir casos para otras empresas cuando se implementen
        default:
          return {
            success: false,
            error: `No hay integración disponible para la empresa: ${empresaSlug}`,
            codigo: 'INTEGRACION_NO_DISPONIBLE'
          };
      }
    } catch (error) {
      console.error('Error al obtener deudas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 'ERROR_INESPERADO'
      };
    }
  }
}
