# Integración de Empresas - Documentación

Este módulo implementa un sistema de integración flexible para diferentes empresas utilizando el patrón Factory.

## Estructura del Patrón Factory

El patrón Factory implementado permite integrar fácilmente diferentes APIs de empresas bajo una interfaz común. Esto facilita:

1. **Extensibilidad**: Añadir nuevas empresas sin modificar código existente
2. **Consistencia**: Todas las integraciones siguen la misma estructura
3. **Mantenibilidad**: Cambios en una integración no afectan a otras
4. **Encapsulamiento**: Los detalles específicos de cada API están encapsulados

## Componentes Principales

### IntegrationService (Interfaz Base)

Define los métodos comunes que deben implementar todas las integraciones:
- `getEmpresaConfig`: Obtiene la configuración de la empresa
- `validateApiKey`: Verifica si una API key es válida 
- `checkServiceStatus`: Comprueba si el servicio está disponible

### BaseIntegrationService (Clase Base Abstracta)

Proporciona implementaciones comunes para:
- Validación básica de API key
- Manejo de configuraciones
- Métodos utilitarios para respuestas estandarizadas
- Manejo de errores consistente

### EmpsaatIntegration (Implementación Específica)

Implementa la integración específica para EMPSAAT con:
- Endpoints para consulta de deudas
- Procesamiento de pagos
- Consulta de abonados
- Manejo específico de errores

### IntegrationFactory (Fábrica)

Facilita la creación y gestión de las diferentes integraciones:
- Método `getIntegration`: Retorna la integración adecuada según el slug de empresa
- Métodos específicos como `getEmpsaatIntegration`: Facilitan el acceso a integraciones específicas
- Caché de integraciones para evitar recreaciones innecesarias

## Servicios de Nivel Superior

### DeudasService

Servicio para operaciones relacionadas con deudas:
- `obtenerDeudasAbonado`: Consulta deudas de un abonado a través del servicio de integración

### PagosService

Servicio para operaciones relacionadas con pagos:
- `procesarPagoServicios`: Procesa el pago de servicios
- `procesarPagoAgua`: Procesa el pago de facturas de agua

### AbonadosService

Servicio para operaciones relacionadas con abonados:
- `obtenerAbonados`: Consulta lista de abonados según filtros
- `obtenerAbonadoPorId`: Consulta información detallada de un abonado

## Cómo Extender con Nuevas Empresas

Para añadir una nueva empresa, sigue estos pasos:

1. **Crea interfaces específicas** para los tipos de datos de la nueva empresa (si son diferentes)
2. **Implementa una clase específica** que extienda `BaseIntegrationService`
3. **Añade el nuevo caso** al switch en `IntegrationFactory.getIntegration()`
4. **Añade un método helper** en `IntegrationFactory` (ej: `getNewCompanyIntegration()`)
5. **Actualiza los servicios** (DeudasService, PagosService, AbonadosService) para soportar la nueva empresa

## Ejemplo:

```typescript
// Añadir la integración de una nueva empresa
export class NewCompanyIntegration extends BaseIntegrationService implements NewCompanyIntegrationService {
  // Implementación específica...
}

// Añadir el caso en IntegrationFactory
switch (empresaSlug) {
  case 'empsaat':
    integration = new EmpsaatIntegration(empresaConfig);
    break;
  case 'nueva-empresa':
    integration = new NewCompanyIntegration(empresaConfig);
    break;
  // ...
}
```
