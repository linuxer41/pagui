# Integración con API de EMPSAAT

Este documento describe cómo configurar y utilizar la integración con la API de EMPSAAT.

## Configuración de la API

La configuración de la API se realiza directamente en el archivo de configuración de empresas:

```typescript
// src/lib/config/empresas.ts
export const empresasConfig: Record<string, EmpresaConfig> = {
  'empsaat': {
    // ... otros campos
    apiKey: 'TU_API_KEY',
    apiBaseUrl: 'https://api.empsaat.com/v1',
    // ... otros campos
  }
};
```

### Campos de configuración importantes:

- `apiKey`: Clave de API para autenticación con el servicio
- `apiBaseUrl`: URL base de la API de EMPSAAT
- `permisos`: Lista de permisos disponibles para esta integración

## Estructura de la Integración

La integración con EMPSAAT está implementada siguiendo el patrón Factory:

1. **EmpsaatService**: Clase principal que proporciona métodos para consultar deudas, abonados y procesar pagos.
2. **EmpsaatIntegration**: Clase de bajo nivel que maneja la comunicación directa con la API.
3. **IntegrationFactory**: Fábrica que crea instancias de las integraciones según la empresa.

## Uso en Acciones del Servidor

La integración está configurada para ser utilizada en acciones del servidor de SvelteKit:

- La URL base se toma automáticamente de la configuración de la empresa
- Las API keys se mantienen seguras en el servidor
- Los datos se transforman para presentarlos adecuadamente al cliente

## Endpoints Disponibles

La aplicación proporciona los siguientes endpoints:

- `/recaudaciones/empsaat` - Interfaz para consultar deudas y procesar pagos
- Acciones disponibles:
  - `buscarDeudas` - Busca deudas por número de abonado
  - `pagarFacturasAgua` - Procesa pagos de facturas de agua
  - `pagarServicios` - Procesa pagos de servicios