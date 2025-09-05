# Configuración de Empresas y Operaciones QR

Este proyecto implementa un sistema de configuración de empresas para operaciones de generación, consulta y cancelación de códigos QR.

## Estructura de Archivos

### Configuración de Empresas
- `src/lib/config/empresas.ts` - Configuración principal de empresas
- `src/lib/config/errores.ts` - Manejo de errores del sistema
- `src/lib/config/serverErrors.ts` - Errores específicos del servidor

### Utilidades
- `src/lib/utils/empresaUtils.ts` - Funciones de validación y utilidades

### Tipos
- `src/lib/types/api.ts` - Interfaces TypeScript para la API

### Servidor
- `src/routes/recaudaciones/[slug]/+page.server.ts` - Lógica del servidor para operaciones QR

## Configuración de una Nueva Empresa

Para agregar una nueva empresa, edita el archivo `src/lib/config/empresas.ts`:

```typescript
'empresa-nueva': {
  id: 'empresa-nueva',
  slug: 'empresa-nueva',
  nombre: 'Nombre de la Empresa',
  logo: '🏢',
  descripcion: 'Descripción de la empresa',
  color: 'rgb(var(--primary))',
  gradiente: 'var(--gradient-primary)',
  instrucciones: 'Instrucciones para el usuario',
  apiKey: 'pk_live_empresa_nueva_2024',
  permisos: ['qr_generate', 'qr_status', 'qr_cancel'],
  activa: true,
  configuracionQR: {
    montoMinimo: 10,
    montoMaximo: 1000,
    tiempoExpiracion: 30,
    moneda: 'BOB'
  }
}
```

## Operaciones Disponibles

### 1. Generar QR
**Endpoint:** `POST /recaudaciones/[slug]`
**Acción:** `generarQR`

**Parámetros requeridos:**
- `apiKey`: API Key de la empresa
- `monto`: Monto del cobro
- `descripcion`: Descripción del cobro
- `transactionId`: ID único de la transacción

**Permiso requerido:** `qr_generate`

### 2. Consultar Estado del QR
**Endpoint:** `POST /recaudaciones/[slug]`
**Acción:** `verificarEstadoQR`

**Parámetros requeridos:**
- `apiKey`: API Key de la empresa
- `qrId`: ID del código QR

**Permiso requerido:** `qr_status`

### 3. Cancelar QR
**Endpoint:** `POST /recaudaciones/[slug]`
**Acción:** `cancelarQR`

**Parámetros requeridos:**
- `apiKey`: API Key de la empresa
- `qrId`: ID del código QR

**Permiso requerido:** `qr_cancel`

## Validaciones Automáticas

El sistema valida automáticamente:

1. **Existencia de la empresa** - Verifica que el slug exista
2. **Estado de la empresa** - Solo empresas activas pueden operar
3. **API Key** - Valida que la API Key corresponda a la empresa
4. **Permisos** - Verifica que la empresa tenga los permisos necesarios
5. **Parámetros QR** - Valida montos mínimos/máximos y descripción

## Manejo de Errores

El sistema maneja errores de forma consistente:

- **Errores críticos (tipo: 'error')**: Impiden la operación
- **Advertencias (tipo: 'warning')**: Permiten la operación pero muestran advertencias

### Códigos de Error Comunes

- `EMPRESA_NO_CONFIGURADA`: La empresa no existe
- `EMPRESA_INACTIVA`: La empresa está desactivada
- `API_KEY_INVALIDA`: API Key incorrecta
- `PERMISO_INSUFICIENTE`: Falta de permisos
- `MONTO_INSUFICIENTE`: Monto menor al mínimo permitido
- `MONTO_EXCESIVO`: Monto mayor al máximo permitido

## Seguridad

- Las API Keys nunca se exponen en el cliente
- Todas las validaciones se realizan en el servidor
- Los permisos son granulares por operación
- La configuración sensible está protegida

## Uso en el Cliente

El cliente solo recibe datos públicos de la empresa:

```typescript
// En +page.svelte
export let data;
const { empresa } = data;

// Solo datos públicos disponibles:
// empresa.nombre, empresa.logo, empresa.descripcion, etc.
// NO: empresa.apiKey, empresa.permisos, empresa.configuracionQR
```

## Ejemplo de Uso

```typescript
// Generar QR
const formData = new FormData();
formData.append('apiKey', 'tu_api_key');
formData.append('monto', '100');
formData.append('descripcion', 'Pago por servicios');
formData.append('transactionId', 'txn_123');

const response = await fetch(`/recaudaciones/empresa-a?/generarQR`, {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('QR generado:', result.qrData);
} else {
  console.error('Error:', result.error);
}
```

## Personalización

Para personalizar el sistema:

1. **Agregar nuevas empresas** en `empresas.ts`
2. **Definir nuevos permisos** en la configuración de empresas
3. **Agregar validaciones** en `empresaUtils.ts`
4. **Crear nuevos códigos de error** en `serverErrors.ts`
5. **Implementar lógica de negocio** en `+page.server.ts`
