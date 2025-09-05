// Barrel file para exportar servicios

// Exportar servicio principal consolidado
export * from './EmpsaatService';

// Exportar servicios de integración de bajo nivel
export * from './integration/IntegrationService';
export * from './integration/EmpsaatIntegration';
export * from './integration/IntegrationFactory';

// Exportar tipos relacionados
export type {
  IntegrationService,
  BaseIntegrationService
} from './integration/IntegrationService';

export type {
  EmpsaatIntegrationService
} from './integration/EmpsaatIntegration';