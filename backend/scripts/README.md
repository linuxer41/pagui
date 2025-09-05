# Scripts de Utilidad

## Generador de QR con API Key

### Descripción
Script interactivo para generar códigos QR usando la API key del sistema. Permite crear, consultar y gestionar códigos QR de forma interactiva desde la línea de comandos.

### Archivo
`generate-qr-with-apikey.js`

### API Key Configurada
```
ZSkzucwhnRv5L0UhIqd5uwgKG35JghJ69iHti20E
```

### Características
- **Interfaz interactiva** con menús y colores
- **Validación de datos** en tiempo real
- **Generación de QR** con parámetros personalizables
- **Consulta de estado** de QRs existentes
- **Listado de QRs** recientes
- **Verificación de permisos** de la API key

### Requisitos Previos
1. **Servidor ejecutándose** en `http://localhost:3000`
2. **API key válida** con permisos de QR
3. **Bun instalado** en el sistema
4. **Base de datos** configurada y accesible

### Ejecución

#### Opción 1: Usando NPM Script
```bash
bun run qr-generator
```

#### Opción 2: Ejecución directa
```bash
bun run scripts/generate-qr-with-apikey.js
```

#### Opción 3: Ejecución con permisos
```bash
chmod +x scripts/generate-qr-with-apikey.js
./scripts/generate-qr-with-apikey.js
```

### Funcionalidades

#### 1. Generar Nuevo Código QR
- **Monto**: Número decimal mayor a 0
- **Moneda**: BOB (por defecto), USD, EUR
- **Descripción**: Texto opcional
- **Fecha de vencimiento**: Formato YYYY-MM-DD HH:MM (opcional)
- **Uso único**: Sí/No (por defecto: Sí)
- **Modificar monto**: Sí/No (por defecto: No)

#### 2. Consultar Estado de QR
- **QR ID**: Identificador del código QR
- **Información mostrada**:
  - Datos básicos del QR
  - Estado actual
  - Pagos realizados (si los hay)
  - Fechas de creación y vencimiento

#### 3. Listar QRs Recientes
- **Muestra**: Lista de QRs recientes del usuario
- **Información**: ID, monto, moneda, estado, fecha

#### 4. Verificar Permisos de API Key
- **Generación**: Verifica permiso de crear QRs
- **Consulta**: Verifica permiso de consultar estado
- **Cancelación**: Verifica permiso de cancelar QRs

### Ejemplo de Uso

```bash
# Iniciar el generador
bun run qr-generator

# Seleccionar opción 1 (Generar QR)
# Ingresar monto: 150.75
# Seleccionar moneda: BOB
# Descripción: Pago de servicios
# Fecha vencimiento: 2025-08-30 18:00
# Uso único: s
# Modificar monto: n
# Confirmar: s
```

### Estructura de Datos del QR

```json
{
  "amount": "150.75",
  "currency": "BOB",
  "description": "Pago de servicios",
  "singleUse": true,
  "modifyAmount": false,
  "dueDate": "2025-08-30T18:00:00.000Z"
}
```

### Respuesta de la API

```json
{
  "success": true,
  "message": "QR generado exitosamente",
  "data": {
    "qrId": "25082901016835001946",
    "transactionId": "TX-1756463834495",
    "amount": "150.75",
    "currency": "BOB",
    "status": "active",
    "qrUrl": "https://api.pagui.com/qr/25082901016835001946",
    "createdAt": "2025-08-29T10:37:16.143Z",
    "dueDate": "2025-08-30T18:00:00.000Z"
  }
}
```

### Manejo de Errores

El script maneja automáticamente:
- **Errores de conexión** al servidor
- **API keys inválidas** o sin permisos
- **Datos malformados** o inválidos
- **Errores de la base de datos**
- **Timeouts** de la API

### Personalización

#### Cambiar API Key
Editar la constante `API_KEY` en el archivo:
```javascript
const API_KEY = 'TU_NUEVA_API_KEY_AQUI';
```

#### Cambiar URL del Servidor
Editar la constante `BASE_URL`:
```javascript
const BASE_URL = 'https://tu-servidor.com';
```

#### Agregar Nuevas Monedas
Modificar la validación en `handleGenerateQR()`:
```javascript
if (['BOB', 'USD', 'EUR', 'NUEVA_MONEDA'].includes(curr)) {
  resolve(curr);
}
```

### Seguridad

- **API Key**: Se muestra parcialmente en la consola
- **Validación**: Todos los datos se validan antes de enviar
- **Permisos**: Se verifican los permisos antes de cada operación
- **Logs**: No se almacenan datos sensibles en logs

### Troubleshooting

#### Error: "Servidor no responde"
```bash
# Verificar que el servidor esté ejecutándose
curl http://localhost:3000/health

# Iniciar servidor si es necesario
bun run dev
```

#### Error: "API Key inválida"
- Verificar que la API key esté correcta
- Confirmar que tenga permisos de QR
- Verificar que no haya expirado

#### Error: "Permisos insuficientes"
- Verificar que la API key tenga permisos de `qr_generate`
- Confirmar que el usuario esté activo
- Verificar configuración de permisos en la base de datos

### Integración con CI/CD

El script puede ser integrado en pipelines de CI/CD:
```bash
# Ejemplo de uso en CI/CD
echo "Generando QR de prueba..."
echo '{"amount":"1.00","currency":"BOB"}' | bun run qr-generator --non-interactive
```

### Notas Importantes

- **Interactivo**: Requiere entrada del usuario
- **Colores**: Optimizado para terminales con soporte de colores
- **Validación**: Valida datos antes de enviar a la API
- **Manejo de errores**: Robusto y informativo
- **Documentación**: Incluye ayuda contextual en cada paso
