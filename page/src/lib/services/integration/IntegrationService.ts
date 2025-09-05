import type { ServerResponse } from '../../types/api';
import type { EmpresaConfig } from '../../config/empresas';

/**
 * Interfaz base para todos los servicios de integración
 * Define métodos comunes que deben implementar todas las integraciones
 */
export interface IntegrationService {
  /**
   * Obtiene la configuración de la empresa para esta integración
   */
  getEmpresaConfig(): EmpresaConfig;

  /**
   * Verifica si la API key es válida
   */
  validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * Verifica si el servicio está disponible/activo
   */
  checkServiceStatus(): Promise<boolean>;
}

/**
 * Clase base abstracta con implementaciones comunes para servicios de integración
 */
export abstract class BaseIntegrationService implements IntegrationService {
  protected empresaConfig: EmpresaConfig;

  constructor(empresaConfig: EmpresaConfig) {
    this.empresaConfig = empresaConfig;
  }

  /**
   * Obtiene la configuración de la empresa
   */
  getEmpresaConfig(): EmpresaConfig {
    return this.empresaConfig;
  }

  /**
   * Validación simple de API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    return this.empresaConfig.apiKey === apiKey;
  }

  /**
   * Implementación por defecto para verificar disponibilidad del servicio
   * Las clases hijas pueden sobrescribirlo con comprobaciones más específicas
   */
  async checkServiceStatus(): Promise<boolean> {
    return this.empresaConfig.activa;
  }

  /**
   * Método utilitario para crear respuestas consistentes
   */
  protected createSuccessResponse<T>(data: T, message = 'Operación exitosa'): ServerResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Método utilitario para crear respuestas de error consistentes
   */
  protected createErrorResponse(error: string, codigo = 'ERROR_GENERAL'): ServerResponse {
    return {
      success: false,
      error,
      codigo
    };
  }

  /**
   * Método para manejar errores de API de forma consistente
   */
  protected handleApiError(error: any): ServerResponse {
    console.error('Error de integración:', error);
    
    // Si el error ya tiene un formato específico, lo preservamos
    if (error && typeof error === 'object' && 'codigo' in error) {
      return {
        success: false,
        error: error.message || 'Error en la integración',
        codigo: error.codigo
      };
    }
    
    // Caso genérico
    return {
      success: false,
      error: error?.message || 'Error desconocido en la integración',
      codigo: 'ERROR_INTEGRACION'
    };
  }
}
