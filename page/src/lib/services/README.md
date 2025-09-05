# Servicios de Integración EMPSAAT

Este módulo proporciona un servicio consolidado para integración con la API de EMPSAAT.

## Estructura Simplificada

La implementación utiliza un enfoque simplificado donde:

1. Se mantiene el patrón Factory para la capa de integración de bajo nivel
2. Se consolida toda la funcionalidad del negocio en un único servicio `EmpsaatService`

## EmpsaatService

Clase principal que proporciona todos los métodos necesarios para interactuar con la API de EMPSAAT:

### Métodos Principales

- **obtenerDeudas(abonado, apiKey)**: Consulta las deudas de un abonado
- **procesarPagoServicios(abonado, datos, apiKey)**: Procesa pagos de servicios
- **procesarPagoAgua(abonado, datos, apiKey)**: Procesa pagos de facturas de agua
- **obtenerAbonados(params, apiKey)**: Obtiene lista de abonados según filtros
- **obtenerAbonadoPorId(abonado, apiKey)**: Obtiene información detallada de un abonado
- **verificarDisponibilidad()**: Comprueba si el servicio está disponible

## Capa de Integración

La capa de integración de bajo nivel sigue utilizando el patrón Factory para mantener la extensibilidad:

- **IntegrationService**: Interfaz base para integraciones
- **EmpsaatIntegration**: Implementación específica para EMPSAAT
- **IntegrationFactory**: Fábrica para crear instancias de integración

## Ejemplo de Uso

```typescript
import { EmpsaatService } from '$lib/services/EmpsaatService';

// Consultar deudas
const deudas = await EmpsaatService.obtenerDeudas(123456, 'API_KEY_EMPSAAT');

// Procesar pago
const resultado = await EmpsaatService.procesarPagoServicios(
  123456, 
  {
    total: 150.75,
    usuario: 'cliente123',
    nit: '12345678',
    idServicios: [1, 2, 3]
  },
  'API_KEY_EMPSAAT'
);

// Obtener abonado
const abonado = await EmpsaatService.obtenerAbonadoPorId(123456, 'API_KEY_EMPSAAT');
```

## Ventajas de Este Enfoque

- **Simplicidad**: Un único punto de entrada para todas las operaciones
- **Coherencia**: Manejo consistente de errores y validaciones
- **Mantenibilidad**: Código más compacto y fácil de mantener
- **Extensibilidad**: La capa de bajo nivel sigue siendo extensible para nuevas empresas

La clase EmpsaatService centraliza toda la lógica de negocio manteniendo el patrón Factory en la capa de integración para facilitar la adición de nuevas empresas en el futuro.
