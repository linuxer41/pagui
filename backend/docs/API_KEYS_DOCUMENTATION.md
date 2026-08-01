# Documentación de API Keys

## Descripción General

Las API Keys son una forma de autenticación alternativa a los tokens JWT que permite a sistemas externos integrarse con Pagui de manera segura. Cada API Key está asociada a una **billetera de recaudación** específica y tiene permisos granulares para diferentes operaciones.

La **API Pública** corre en un servidor independiente (puerto `PUBLIC_API_PORT`, por defecto `3001`) y se autentica **exclusivamente** con API Keys, separada del API interna que usa JWT.

## Estructura de una API Key

```json
{
  "id": 2442123456789000001,
  "apiKey": "pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC",
  "walletId": 2442123456789000002,
  "description": "API Key de demostración",
  "permissions": {
    "qr_generate": true,
    "qr_status": true,
    "qr_cancel": false
  },
  "expiresAt": "2027-08-27T10:48:35.644Z",
  "status": "active",
  "createdAt": "2026-08-27T10:48:35.644Z",
  "updatedAt": "2026-08-27T10:48:35.644Z"
}
```

- `apiKey`: prefijo `pg_` + 40 caracteres alfanuméricos. Se muestra **una sola vez** al crearla.
- `status`: `active` | `REVOKED` | `EXPIRED`.
- Las claves expiradas se marcan automáticamente como `EXPIRED`.

## Autenticación con API Keys

Para usar una API Key, inclúyela en el encabezado `X-API-Key` de todas las peticiones:

```bash
curl -X GET "http://localhost:3001/qr/list" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC"
```

## API Pública

- **URL base:** `http://localhost:3001` (configurable vía `PUBLIC_API_PORT`).
- **Documentación interactiva (Swagger/OpenAPI):** `http://localhost:3001/docs`.
- **Formato de respuesta:** `{ "success": true, "data": ..., "message": "..." }`.
- **Paginación:** `{ "success": true, "data": [...], "totalCount": N, "message": "..." }`.

## Endpoints Disponibles

### 1. Generar Código QR

**Endpoint:** `POST /qr/generate`

**Permisos requeridos:** `qr_generate`

**Descripción:** Genera un código QR para cobro usando la API Key. El QR queda asociado a la billetera de recaudación de la API Key (el campo `walletId` del body es ignorado).

**Body:**
```json
{
  "amount": 150.50,
  "currency": "BOB",
  "description": "Pago de servicios",
  "dueDate": "2026-12-31",
  "singleUse": true,
  "modifyAmount": false,
  "transactionId": "TXN-2026-000123"
}
```

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `amount` | number | ✅ | — | Monto a cobrar (mínimo 0.01) |
| `currency` | string | ❌ | `BOB` | Moneda |
| `description` | string | ❌ | — | Descripción del cobro |
| `dueDate` | string | ❌ | `2025-12-31` | Fecha de vencimiento |
| `singleUse` | boolean | ❌ | `true` | QR de un solo uso |
| `modifyAmount` | boolean | ❌ | `false` | Permite modificar monto al pagar |
| `transactionId` | string | ❌ | auto | **ID de referencia del cliente** para identificar el QR; si se omite, PAGUI genera uno automático (`TXN...`) |

**Ejemplo:**
```bash
curl -X POST "http://localhost:3001/qr/generate" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.50,
    "description": "Pago de servicios"
  }'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "QR generado exitosamente",
  "data": {
    "id": 2442123456789000001,
    "qrId": "2412271016000000001",
    "transactionId": "TXN1714851234567x8k2m",
    "walletId": 2442123456789000002,
    "amount": 150.5,
    "currency": "BOB",
    "description": "Pago de servicios",
    "dueDate": "2025-12-31T00:00:00.000Z",
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "singleUse": true,
    "modifyAmount": false,
    "status": "active",
    "createdAt": "2026-08-27T10:48:35.644Z"
  }
}
```

### 2. Listar Códigos QR

**Endpoint:** `GET /qr/list`

**Permisos requeridos:** `qr_status`

**Descripción:** Lista los códigos QR de la billetera de recaudación con filtros opcionales.

**Query params (opcionales):**
- `page`: página (default `1`)
- `limit`: resultados por página (default `20`)
- `status`: `active` | `used` | `cancelled` | `expired`
- `from`: fecha inicial (YYYY-MM-DD)
- `to`: fecha final (YYYY-MM-DD)
- `startDate` / `endDate`: alias de `from` / `to`

**Ejemplo:**
```bash
curl -X GET "http://localhost:3001/qr/list?status=active&limit=10" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC"
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "totalCount": 1,
  "message": "QR listados exitosamente",
  "data": [
    {
      "id": 2442123456789000001,
      "qrId": "2412271016000000001",
      "transactionId": "TXN1714851234567x8k2m",
      "walletId": 2442123456789000002,
      "amount": 150.5,
      "currency": "BOB",
      "status": "active",
      "createdAt": "2026-08-27T10:48:35.644Z"
    }
  ]
}
```

### 3. Verificar Estado de QR

**Endpoint:** `GET /qr/{qrId}/status`

**Permisos requeridos:** `qr_status`

**Descripción:** Verifica el estado actual de un código QR e incluye el historial de pagos.

**Estados posibles:** `active` (pendiente), `used` (pagado), `cancelled` (anulado), `expired` (expirado).

**Ejemplo:**
```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001/status" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC"
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Estado del QR verificado",
  "data": {
    "id": 2442123456789000001,
    "qrId": "2412271016000000001",
    "amount": 150.5,
    "currency": "BOB",
    "status": "used",
    "payments": [
      {
        "id": 2442123456789000005,
        "wallet_id": 2442123456789000002,
        "qr_id": "2412271016000000001",
        "amount": 150.5,
        "currency": "BOB",
        "movement_type": "qr_payment",
        "status": "completed",
        "sender_name": "Juan Pérez",
        "created_at": "2026-08-27T11:00:00.000Z"
      }
    ]
  }
}
```

### 4. Detalle de QR

**Endpoint:** `GET /qr/{qrId}`

**Descripción:** Obtiene el detalle de un código QR (sin historial de pagos).

**Ejemplo:**
```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC"
```

### 5. Pagos de un QR

**Endpoint:** `GET /qr/{qrId}/payments`

**Descripción:** Lista los pagos recibidos por un código QR.

**Ejemplo:**
```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001/payments" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC"
```

### 6. Cancelar QR

**Permisos requeridos:** `qr_cancel`

El QR solo puede cancelarse si su estado es `active`.

**6a. Cancelar por body:**
```bash
curl -X DELETE "http://localhost:3001/qr/cancelQR" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC" \
  -H "Content-Type: application/json" \
  -d '{ "qrId": "2412271016000000001" }'
```

**6b. Cancelar por URL:**
```bash
curl -X DELETE "http://localhost:3001/qr/2412271016000000001" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC"
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "QR cancelado exitosamente",
  "data": { "qrId": "2412271016000000001" }
}
```

## Gestión de API Keys

Los endpoints de gestión requieren **JWT** (API interna, puerto `3000`). Solo el propietario de la billetera de recaudación puede gestionar sus claves.

### Crear API Key

**Endpoint:** `POST /api/api-keys`

**Body:**
```json
{
  "walletId": "2442123456789000002",
  "description": "API Key para integración móvil",
  "permissions": {
    "qr_generate": true,
    "qr_status": true,
    "qr_cancel": false
  },
  "expiresAt": "2027-12-31T23:59:59Z"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `walletId` | string | ✅ | ID de la billetera de recaudación |
| `description` | string | ✅ | Descripción de la clave |
| `permissions` | object | ✅ | Permisos granulares (`qr_generate`, `qr_status`, `qr_cancel`) |
| `expiresAt` | string | ❌ | Fecha de expiración (ISO). Sin expiración si se omite |

**Respuesta exitosa:** La clave completa (ver estructura arriba). Guarda `data.apiKey`, **no se vuelve a mostrar**.

### Listar API Keys

**Endpoint:** `GET /api/api-keys?walletId=2442123456789000002`

**Descripción:** Lista las API keys activas de la billetera de recaudación.

### Revocar API Key

**Endpoint:** `DELETE /api/api-keys/{apiKeyId}`

**Descripción:** Revoca una API key. Una vez revocada deja de ser válida inmediatamente.

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "API key revocada"
}
```

## Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `qr_generate` | Generar códigos QR para cobros |
| `qr_status` | Consultar estado, listar QR y ver pagos |
| `qr_cancel` | Cancelar códigos QR activos |

## Manejo de Errores

### Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 401 | API Key inválida o expirada | Verificar que la API Key sea correcta y no haya expirado |
| 403 | Permisos insuficientes | Verificar que la API Key tenga el permiso necesario (ej. `qr_generate`) |
| 404 | Recurso no encontrado | Verificar que el `qrId` o ID sea correcto |
| 429 | Límite de rate limit excedido | Reducir la frecuencia de peticiones (120 req/min por defecto) |
| 500 | Error interno del servidor | Contactar al soporte técnico |

### Ejemplo de Respuesta de Error

```json
{
  "success": false,
  "error": "API key no tiene permiso qr_generate",
  "message": "API key no tiene permiso qr_generate"
}
```

## Seguridad y Mejores Prácticas

1. **Almacenamiento seguro:** nunca almacenes API Keys en código fuente; usa variables de entorno o gestores de secretos.
2. **Permisos mínimos:** asigna solo los permisos necesarios para cada integración.
3. **Rotación regular:** crea claves nuevas y revoca las antiguas periódicamente.
4. **Monitoreo:** revisa el uso de las API Keys y revoca las que no se utilicen.
5. **Rate limiting:** respeta el límite de 120 req/min; implementa reintentos con backoff exponencial.

## Ejemplos de Implementación

### JavaScript/Node.js

```javascript
class PaguiPublicAPI {
  constructor(apiKey, baseURL = 'http://localhost:3001') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generate(data) {
    const res = await fetch(`${this.baseURL}/qr/generate`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async checkQRStatus(qrId) {
    const res = await fetch(`${this.baseURL}/qr/${qrId}/status`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

const api = new PaguiPublicAPI('pg_tu_api_key_aqui');
const qr = await api.generate({ amount: 100, description: 'Pago de prueba' });
```

### Python

```python
import requests

class PaguiPublicAPI:
    def __init__(self, api_key, base_url='http://localhost:3001'):
        self.headers = {'X-API-Key': api_key, 'Content-Type': 'application/json'}
        self.base_url = base_url

    def generate_qr(self, data):
        res = requests.post(f'{self.base_url}/qr/generate', headers=self.headers, json=data)
        res.raise_for_status()
        return res.json()

    def check_qr_status(self, qr_id):
        res = requests.get(f'{self.base_url}/qr/{qr_id}/status', headers=self.headers)
        res.raise_for_status()
        return res.json()

api = PaguiPublicAPI('pg_tu_api_key_aqui')
qr = api.generate_qr({'amount': 100, 'description': 'Pago de prueba'})
```

### cURL

```bash
API_KEY="pg_tu_api_key_aqui"
BASE_URL="http://localhost:3001"

# Generar QR
curl -X POST "${BASE_URL}/qr/generate" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "Pago de prueba"}'

# Verificar estado
curl -X GET "${BASE_URL}/qr/2412271016000000001/status" \
  -H "X-API-Key: ${API_KEY}"
```

## Conclusión

Las API Keys proporcionan una forma segura y flexible de integrar aplicaciones externas con la API de pagos QR de Pagui. La API Pública es independiente de la API interna (JWT), está documentada con Swagger en `/docs` y permite controlar los permisos de cada integración de forma granular.
