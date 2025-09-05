import type { EmpresaConfig } from '../../config/empresas';
import { getEmpresaConfig, isEmpresaConfigurada } from '../../config/empresas';
import type { IntegrationService } from './IntegrationService';
import { EmpsaatIntegration } from './EmpsaatIntegration';
import type { EmpsaatIntegrationService } from './EmpsaatIntegration';

/**
 * Factory para crear servicios de integración según la empresa
 * Implementa el patrón Factory para gestionar diferentes integraciones
 */
export class IntegrationFactory {
  // Caché de integraciones ya creadas
  private static integrations = new Map<string, IntegrationService>();

  /**
   * Obtiene una instancia del servicio de integración según el slug de la empresa
   */
  static getIntegration(empresaSlug: string): IntegrationService | null {
    // Verificar si la empresa está configurada
    if (!isEmpresaConfigurada(empresaSlug)) {
      console.error(`Empresa no configurada: ${empresaSlug}`);
      return null;
    }

    // Si ya tenemos una instancia en caché, la devolvemos
    if (this.integrations.has(empresaSlug)) {
      return this.integrations.get(empresaSlug) || null;
    }

    // Obtener configuración de empresa
    const empresaConfig = getEmpresaConfig(empresaSlug);
    if (!empresaConfig) {
      console.error(`Configuración no encontrada para: ${empresaSlug}`);
      return null;
    }

    // Crear la instancia según el tipo de empresa
    let integration: IntegrationService | null = null;

    switch (empresaSlug) {
      case 'empsaat':
        integration = new EmpsaatIntegration(empresaConfig);
        break;
      // Añadir casos para otras empresas cuando se implementen
      default:
        console.error(`No hay integración implementada para: ${empresaSlug}`);
        return null;
    }

    // Guardar en caché para futuros usos
    if (integration) {
      this.integrations.set(empresaSlug, integration);
    }

    return integration;
  }

  /**
   * Obtiene una instancia específica del servicio de integración EMPSAAT
   */
  static getEmpsaatIntegration(): EmpsaatIntegrationService | null {
    const integration = this.getIntegration('empsaat');
    return integration as EmpsaatIntegrationService | null;
  }

  /**
   * Limpiar caché de integraciones (útil para pruebas o reinicio)
   */
  static clearCache(): void {
    this.integrations.clear();
  }
}
