# EmpsaatService - Servicio Actualizado

## 📋 Resumen de Cambios

El servicio de EMPSAAT ha sido actualizado para implementar el **nuevo flujo de transacciones de dos pasos** que proporciona mayor seguridad y trazabilidad en el procesamiento de pagos.

### ✅ **Actualización con Datos Reales**

Los tipos TypeScript han sido ajustados para coincidir exactamente con la estructura de datos real que devuelve la API de EMPSAAT, incluyendo:

- Estructura de respuesta con `type`, `status` y `data`
- Campos de abonado actualizados (`ci`, `direccion`, etc.)
- Fechas de servicios como strings en formato ISO
- Totales generales en la respuesta

## 🔄 Nuevo Flujo de Transacciones

### Antes (Flujo Antiguo)
```
Buscar Deudas → Procesar Pago Directo
```

### Ahora (Flujo Nuevo)
```
Buscar Deudas → Crear Transacción → Completar Transacción
```

## 🚀 Métodos Principales

### 1. `buscarDeudasPorCriterio(keyword, type)`
Busca deudas por diferentes criterios.

**Parámetros:**
- `keyword` (string): Palabra clave para buscar
- `type` ('nombre' | 'documento' | 'abonado'): Tipo de búsqueda

**Ejemplo:**
```typescript
const resultado = await empsaatService.buscarDeudasPorCriterio('8', 'abonado');
```

### 2. `crearTransaccion(abonado, datos)`
Crea una transacción pendiente con las deudas seleccionadas.

**Parámetros:**
- `abonado` (number): Número de abonado
- `datos` (CrearTransaccionRequest): Datos de la transacción

**Ejemplo:**
```typescript
const transaccionData = {
  tax_id: '1438788012',
  business_name: 'Empresa Cliente S.A.',
  email: 'cliente@empresa.com',
  waterDebts: [1875379],
  serviceDebts: [1, 2]
};

const resultado = await empsaatService.crearTransaccion(8, transaccionData);
```

### 3. `completarTransaccion(datos)`
Procesa el pago de una transacción pendiente.

**Parámetros:**
- `datos` (CompletarTransaccionRequest): Datos del pago

**Ejemplo:**
```typescript
const pagoData = {
  transaction_id: 'TXN_1704123456789_ABC123',
  payment_method: 'efectivo',
  amount_paid: 150.50
};

const resultado = await empsaatService.completarTransaccion(pagoData);
```

### 4. `obtenerHistorialTransacciones(abonado)`
Obtiene el historial de transacciones de un abonado.

**Parámetros:**
- `abonado` (number): Número de abonado

**Ejemplo:**
```typescript
const historial = await empsaatService.obtenerHistorialTransacciones(8);
```

## 💡 Ejemplo de Uso Completo

```typescript
import { EmpsaatService } from './EmpsaatService';

const empsaatService = new EmpsaatService(empresaConfig);

async function procesarPago() {
  try {
    // 1. Buscar deudas
    const busqueda = await empsaatService.buscarDeudasPorCriterio('8', 'abonado');
    
    if (!busqueda.success) {
      throw new Error(busqueda.error);
    }
    
    const deudas = busqueda.data.deudas[0];
    const abonado = deudas.abonado.abonado;
    
    // 2. Crear transacción
    const transaccionData = {
      tax_id: '1438788012',
      business_name: 'Empresa Cliente S.A.',
      email: 'cliente@empresa.com',
      waterDebts: deudas.deudasAgua.map(d => d.factura),
      serviceDebts: deudas.deudasServicios.map(s => s.noSolicitud)
    };
    
    const transaccion = await empsaatService.crearTransaccion(abonado, transaccionData);
    
    if (!transaccion.success) {
      throw new Error(transaccion.error);
    }
    
    // 3. Completar transacción
    const pagoData = {
      transaction_id: transaccion.data.transaction_id,
      payment_method: 'efectivo',
      amount_paid: transaccion.data.amount
    };
    
    const pago = await empsaatService.completarTransaccion(pagoData);
    
    if (!pago.success) {
      throw new Error(pago.error);
    }
    
    console.log('✅ Pago procesado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

## 🔒 Validaciones y Seguridad

### Prevención de Duplicados
- No se pueden crear transacciones con deudas que ya están en transacciones pendientes
- El sistema valida automáticamente los conflictos

### Estados de Transacción
- `pending`: Transacción creada, esperando completar
- `completed`: Transacción procesada exitosamente
- `cancelled`: Transacción cancelada

### Reutilización de Deudas
- ✅ Deudas de transacciones **completadas** se pueden reutilizar
- ✅ Deudas de transacciones **canceladas** se pueden reutilizar
- ❌ Deudas de transacciones **pendientes** NO se pueden reutilizar

## 🚨 Manejo de Errores

### Errores Comunes

#### Deudas en Conflicto
```json
{
  "error": "No se puede crear la transacción. Facturas de agua 1875379 ya están en transacción pendiente TXN_1704123456789_ABC123"
}
```

#### Transacción No Encontrada
```json
{
  "error": "Transacción no encontrada"
}
```

#### Transacción Ya Procesada
```json
{
  "error": "La transacción ya fue procesada"
}
```

## 🔧 Configuración

### Headers de API
- `Content-Type: application/json`
- `X-API-Key: tu_api_key`

### Endpoints
- `GET /deudas?keyword={keyword}&type={type}` - Buscar deudas
- `POST /deudas/{abonado}/transaction` - Crear transacción
- `POST /deudas/transaction/complete` - Completar transacción
- `GET /deudas/{abonado}/transactions` - Historial de transacciones

## 📊 Métodos de Pago Soportados

- `efectivo` - Pago en efectivo
- `tarjeta_debito` - Tarjeta de débito
- `tarjeta_credito` - Tarjeta de crédito
- `transferencia` - Transferencia bancaria
- `cheque` - Pago con cheque
- `qr` - Pago por código QR

## 🔄 Compatibilidad hacia Atrás

Los métodos antiguos siguen disponibles pero están marcados como `@deprecated`:

- `procesarPagoAgua()` - Usar `crearTransaccion()` y `completarTransaccion()`
- `procesarPagoServicios()` - Usar `crearTransaccion()` y `completarTransaccion()`

## 🧪 Testing

### Estructura de Datos Real

La API devuelve datos en el siguiente formato:

```json
{
  "type": "success",
  "status": 200,
  "data": {
    "deudas": [
      {
        "abonado": {
          "abonado": 15280,
          "nit": 0,
          "nombre": "15280",
          "ci": "D",
          "medidor": "0",
          "zona": "VILLA REMEDIOS",
          "direccion": " 0",
          "categoria": "A1",
          "estado": "X"
        },
        "deudasAgua": [
          {
            "factura": 1876742,
            "emision": "2025-08-31T00:00:00.000Z",
            "lectura": 30,
            "consumoM3": 0,
            "importeFactura": 18,
            "fechaPago": null,
            "cufFactura": "460D3D7A9E6E12142A5EADDBF2CCC27038A01388212325184D0602F74",
            "abonado": 15283
          }
        ],
        "deudasServicios": [
          {
            "noSolicitud": 230943,
            "fecha": "2019-10-21T00:00:00.000Z",
            "descripcion": "Reposición de formulario",
            "costo": 1
          }
        ],
        "totales": {
          "totalAgua": 18,
          "totalServicios": 1,
          "totalDeuda": 19
        }
      }
    ],
    "totalGeneral": {
      "totalAgua": 429,
      "totalServicios": 621,
      "totalDeuda": 1050
    }
  }
}
```

## 📝 Notas Importantes

1. **Manejo Automático de CUF y Facturas**: El sistema maneja automáticamente la generación de CUF y números de factura según el tipo de deuda
2. **Atomicidad**: Las transacciones se procesan completamente o no se procesan
3. **Trazabilidad**: Cada transacción tiene un ID único y timestamp
4. **Concurrencia**: El sistema previene conflictos automáticamente

## 🆘 Soporte

Para problemas o dudas:
1. Revisar los logs del servidor
2. Verificar los mensajes de error específicos
3. Consultar el estado de las transacciones en la base de datos
4. Verificar que la estructura de datos coincida con la documentación
