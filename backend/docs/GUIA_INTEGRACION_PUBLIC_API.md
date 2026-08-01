# Guía de Integración — PAGUI Public API (QR de cobro)

Guía para **integradores externos** que conectarán sus sistemas (POS, e-commerce, apps) con Pagui mediante **API Key**.

---

## 1. Cómo funciona

1. Pagui te entrega una **API Key** (`pg_...`) asociada a tu billetera de recaudación.
2. Tu sistema usa esa API Key para **generar códigos QR de cobro** y **consultar su estado** en tiempo real.
3. El cliente paga el QR (banca móvil / App Baneco). El dinero llega a tu cuenta según tu config de recaudación.
4. Tu sistema consulta el estado del QR para detectar el pago y confirmar la operación.

```
Tu sistema ──(X-API-Key)──▶ PAGUI Public API ──▶ Baneco
      ◀── qrImage / estado ───┘
```

---

## 2. Datos de conexión

| Dato | Valor |
|------|-------|
| URL base (Public API) | `https://api.pagui.bo/api/public` (producción) / `http://localhost:3001` (local) |
| Autenticación | Header `X-API-Key: pg_...` |
| Formato de request/response | JSON |
| Documentación interactiva (Swagger) | `{base}/docs` |
| Límite de peticiones | 120 req/min por IP (configurable) |

> ⚠️ La API Key se muestra **una sola vez** al crearla. Guárdala de forma segura y no la compartas.

---

## 3. Autenticación

Todas las peticiones deben incluir el header `X-API-Key`:

```bash
curl -X GET "http://localhost:3001/qr/list" \
  -H "X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC"
```

### Permisos de la API Key

Cada clave tiene permisos granulares. La operación falla con **403** si no tienes el permiso:

| Permiso | Operaciones habilitadas |
|---------|-------------------------|
| `qr_generate` | `POST /qr/generate` |
| `qr_status` | `GET /qr/list`, `GET /qr/:qrId/status` |
| `qr_cancel` | `DELETE /qr/cancelQR`, `DELETE /qr/:qrId` |

---

## 4. Ciclo de vida de un cobro QR

```
1. GENERAR   POST /qr/generate        → obtienes qrId + qrImage
2. MOSTRAR   renderiza qrImage (PNG base64) al cliente
3. CONSULTAR GET /qr/:qrId/status      → polling hasta status = "used"
4. PAGOS     GET /qr/:qrId/payments    → detalle de los pagos recibidos
5. CANCELAR  DELETE /qr/:qrId          → (opcional) si el cobro no se completó
```

### Estados del QR

| Estado | Significado |
|--------|-------------|
| `active` | QR vigente, esperando pago |
| `used` | Pago recibido (completado) |
| `cancelled` | Anulado manualmente |
| `expired` | Vencido |

---

## 5. Endpoints

### 5.1 Generar QR de cobro

**`POST /qr/generate`** — permiso `qr_generate`

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
| `description` | string | ❌ | — | Concepto del cobro |
| `dueDate` | string | ❌ | `2025-12-31` | Fecha de vencimiento |
| `singleUse` | boolean | ❌ | `true` | QR de un solo uso |
| `modifyAmount` | boolean | ❌ | `false` | El cliente puede modificar el monto al pagar |
| `transactionId` | string | ❌ | auto | **Tu ID de referencia** para identificar el QR en tu sistema |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "QR generado exitosamente",
  "data": {
    "qrId": "2412271016000000001",
    "transactionId": "TXN1714851234567x8k2m",
    "walletId": 2442123456789000002,
    "amount": 150.5,
    "currency": "BOB",
    "description": "Pago de servicios",
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "singleUse": true,
    "modifyAmount": false,
    "status": "active",
    "createdAt": "2026-08-27T10:48:35.644Z"
  }
}
```

> `qrImage` es un PNG en base64 listo para renderizar en tu app o imprimir.
>
> 💡 **Identifica el QR con tu `transactionId`:** si lo envías, el QR queda asociado a ese ID en tu sistema y aparece en las respuestas (estado, pagos, listado). Si no lo envías, PAGUI genera uno automático (`TXN...`).

---

### 5.2 Consultar estado del QR (polling)

**`GET /qr/:qrId/status`** — permiso `qr_status`

```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001/status" \
  -H "X-API-Key: pg_..."
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Estado del QR verificado",
  "data": {
    "qrId": "2412271016000000001",
    "amount": 150.5,
    "currency": "BOB",
    "status": "used",
    "payments": [
      {
        "id": 2442123456789000005,
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

> Cuando `status === "used"` y hay al menos un `payment` con `status === "completed"`, el cobro está confirmado.

---

### 5.3 Detalle del QR

**`GET /qr/:qrId`**

```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001" \
  -H "X-API-Key: pg_..."
```

Devuelve los datos del QR **sin** el historial de pagos. **404** si no existe.

---

### 5.4 Pagos de un QR

**`GET /qr/:qrId/payments`**

```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001/payments" \
  -H "X-API-Key: pg_..."
```

**Respuesta:**

```json
{
  "success": true,
  "data": [ ...pagos... ],
  "message": "Pagos listados exitosamente"
}
```

---

### 5.5 Listar QR de tu billetera

**`GET /qr/list`** — permiso `qr_status`

Query params opcionales:

| Param | Descripción |
|-------|-------------|
| `page` | Página (default `1`) |
| `limit` | Resultados por página (default `20`) |
| `status` | Filtrar por estado: `active` / `used` / `cancelled` / `expired` |
| `from` / `startDate` | Fecha inicial (YYYY-MM-DD) |
| `to` / `endDate` | Fecha final (YYYY-MM-DD) |

```bash
curl -X GET "http://localhost:3001/qr/list?status=active&limit=10" \
  -H "X-API-Key: pg_..."
```

**Respuesta:**

```json
{
  "success": true,
  "totalCount": 1,
  "message": "QR listados exitosamente",
  "data": [ ...qrs... ]
}
```

---

### 5.6 Cancelar QR

**`DELETE /qr/:qrId`** (por URL) o **`DELETE /qr/cancelQR`** (por body) — permiso `qr_cancel`

```bash
# Por URL
curl -X DELETE "http://localhost:3001/qr/2412271016000000001" \
  -H "X-API-Key: pg_..."

# Por body
curl -X DELETE "http://localhost:3001/qr/cancelQR" \
  -H "X-API-Key: pg_..." \
  -H "Content-Type: application/json" \
  -d '{ "qrId": "2412271016000000001" }'
```

**Respuesta:**

```json
{
  "success": true,
  "message": "QR cancelado exitosamente",
  "data": { "qrId": "2412271016000000001" }
}
```

> Solo se puede cancelar un QR en estado `active`. Si ya fue pagado o cancelado, responde **400**.

---

## 6. Manejo de errores

Todas las respuestas de error usan el formato:

```json
{
  "success": false,
  "error": "mensaje",
  "message": "mensaje"
}
```

| Código | Causa | Solución |
|--------|-------|----------|
| 400 | Validación o estado inválido (ej. monto < 0.01, cancelar QR pagado) | Revisa el body y el estado actual |
| 401 | API Key ausente, inválida o expirada | Verifica el header `X-API-Key` |
| 403 | La API Key no tiene el permiso para la operación | Solicita una key con el permiso necesario |
| 404 | QR no encontrado | Verifica el `qrId` |
| 429 | Rate limit excedido (120 req/min) | Implementa backoff exponencial |
| 500 | Error interno | Contacta a soporte Pagui |

---

## 7. Ejemplos de implementación

### cURL

```bash
API_KEY="pg_tu_api_key_aqui"
BASE_URL="http://localhost:3001"

# Generar QR
curl -X POST "${BASE_URL}/qr/generate" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "Pago de prueba"}'

# Consultar estado
curl -X GET "${BASE_URL}/qr/2412271016000000001/status" \
  -H "X-API-Key: ${API_KEY}"
```

### JavaScript (Node.js) — polling de estado

```javascript
const API_KEY = 'pg_tu_api_key_aqui';
const BASE = 'http://localhost:3001';

const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };

async function generateQR(amount, description) {
  const res = await fetch(`${BASE}/qr/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount, description }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function waitForPayment(qrId, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE}/qr/${qrId}/status`, { headers });
    const { data } = await res.json();
    if (data.status === 'used') return data;
    await new Promise(r => setTimeout(r, 5000)); // poll cada 5s
  }
  throw new Error('Timeout esperando el pago');
}

// Uso
const qr = await generateQR(100, 'Pago de prueba');
const payment = await waitForPayment(qr.data.qrId);
console.log('Pago confirmado:', payment.payments[0]);
```

### Python

```python
import time
import requests

API_KEY = 'pg_tu_api_key_aqui'
BASE = 'http://localhost:3001'
HEADERS = {'X-API-Key': API_KEY, 'Content-Type': 'application/json'}

def generate_qr(amount, description):
    res = requests.post(f'{BASE}/qr/generate', headers=HEADERS,
                        json={'amount': amount, 'description': description})
    res.raise_for_status()
    return res.json()

def wait_for_payment(qr_id, timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        res = requests.get(f'{BASE}/qr/{qr_id}/status', headers=HEADERS)
        data = res.json()['data']
        if data['status'] == 'used':
            return data
        time.sleep(5)
    raise TimeoutError('Timeout esperando el pago')

qr = generate_qr(100, 'Pago de prueba')
payment = wait_for_payment(qr['data']['qrId'])
print('Pago confirmado:', payment['payments'][0])
```

---

## 8. Mejores prácticas

1. **Guarda la API Key de forma segura** (variables de entorno / gestor de secretos). No la incluyas en el repo.
2. **Polling razonable:** consulta el estado cada 5-10 segundos, no más frecuente (rate limit 120 req/min).
3. **Idempotencia:** si tu sistema reintenta la generación de un QR, el `transactionId` cambia en cada llamada; genera un nuevo QR por operación.
4. **Permisos mínimos:** solicita solo los permisos que tu integración necesita.
5. **Maneja el timeout:** define un máximo de espera por pago y cancela el QR si vence.
6. **Verifica siempre `data.status`** antes de confirmar una venta; solo `used` con pago `completed` confirma el cobro.

---

## 9. Documentación relacionada

- Gestión de API Keys (crear/listar/revocar): `API_KEYS_DOCUMENTATION.md`
- Endpoints de API Keys: `API_KEYS_ENDPOINTS.md`
- Eventos SSE en tiempo real: `SSE_EVENTS_DOCUMENTATION.md`
- Configuración Baneco (sandbox/producción): `BANECO_SETUP.md`
