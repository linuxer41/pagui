# Uso del EmpsaatService

## Ejemplo Básico de Uso

```typescript
import { EmpsaatService } from './EmpsaatService';

// Configurar el servicio
const empsaatService = new EmpsaatService({
  id: 'empsaat',
  nombre: 'EMPSAAT',
  apiBaseUrl: 'https://tu-api-url.com',
  apiKey: 'tu_api_key'
});

// Buscar deudas
async function buscarDeudas() {
  const resultado = await empsaatService.buscarDeudasPorCriterio('15288', 'abonado');
  
  if (resultado.success) {
    const deudasData = resultado.data;
    console.log('Deudas encontradas:', deudasData.deudas);
    console.log('Total general:', deudasData.totalGeneral);
  } else {
    console.error('Error:', resultado.error);
  }
}
```

## Estructura de Datos

La respuesta de `buscarDeudasPorCriterio()` devuelve:

```typescript
{
  success: true,
  data: {
    deudas: [
      {
        abonado: {
          abonado: 15288,
          nit: 0,
          nombre: "15288",
          ci: "D",
          medidor: "0",
          zona: "CHAJRAHUASI",
          direccion: "Av. Paraguay - Chajarahuasi 0",
          categoria: "A1",
          estado: "D"
        },
        deudasAgua: [...],
        deudasServicios: [...],
        totales: {
          totalAgua: 274.8,
          totalServicios: 34,
          totalDeuda: 308.8
        }
      }
    ],
    totalGeneral: {
      totalAgua: 429,
      totalServicios: 621,
      totalDeuda: 1050
    }
  }
}
```

## Procesar Pago

```typescript
async function procesarPago() {
  // 1. Buscar deudas
  const busqueda = await empsaatService.buscarDeudasPorCriterio('15288', 'abonado');
  
  if (!busqueda.success) return;
  
  const deuda = busqueda.data.deudas[0];
  const abonado = deuda.abonado.abonado;
  
  // 2. Crear transacción
  const transaccion = await empsaatService.crearTransaccion(abonado, {
    tax_id: '0',
    business_name: deuda.abonado.nombre,
    email: 'cliente@ejemplo.com',
    waterDebts: deuda.deudasAgua.map(f => f.factura),
    serviceDebts: deuda.deudasServicios.map(s => s.noSolicitud)
  });
  
  if (!transaccion.success) return;
  
  // 3. Completar pago
  const pago = await empsaatService.completarTransaccion({
    transaction_id: transaccion.data.transaction_id,
    payment_method: 'efectivo',
    amount_paid: transaccion.data.amount
  });
  
  if (pago.success) {
    console.log('Pago procesado exitosamente');
  }
}
```
