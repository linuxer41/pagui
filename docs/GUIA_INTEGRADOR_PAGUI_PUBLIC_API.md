# PAGUI Public API — Guía para Integradores

> **Versión 1.0** — Documento para integradores de terceros.
> Permite a tu sistema generar códigos QR de cobro y verificar pagos en tiempo real mediante una **API Key**.

---

## 1. Resumen

PAGUI conecta tu negocio con el banco para recibir pagos por **código QR**. Tu sistema se integra con la **PAGUI Public API**:

1. PAGUI te entrega una **API Key** (`pg_...`) vinculada a tu billetera de recaudación.
2. Tu sistema genera un **QR de cobro** por cada operación.
3. El cliente lo paga con su banca móvil.
4. Tu sistema consulta el **estado** del QR y confirma el pago.

```
Tu sistema ──(X-API-Key)──▶ PAGUI Public API ──▶ Banco
     ◀── qrImage / estado / pagos ──┘
```

---

## 2. Datos de conexión

| Dato | Valor |
|------|-------|
| URL base (producción) | `https://api.pagui.bo/api/public` *(confirmar con PAGUI)* |
| URL base (pruebas/local) | `http://localhost:3001` |
| Autenticación | Header `X-API-Key: pg_...` |
| Formato | JSON |
| Documentación interactiva | `{URL_BASE}/docs` (Swagger) |
| Límite de peticiones | 120 req/min por IP |

> ⚠️ La API Key se muestra **una sola vez** al ser emitida. Guárdala de forma segura y no la compartas. Una clave revocada o expirada deja de funcionar de inmediato.

---

## 3. Autenticación

Todas las peticiones deben incluir el header:

```http
X-API-Key: pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC
```

### Permisos

Cada API Key tiene permisos específicos. Sin el permiso necesario la API responde **403**.

| Permiso | Operaciones |
|---------|-------------|
| `qr_generate` | Generar QR de cobro |
| `qr_status` | Consultar estado y listar QR |
| `qr_cancel` | Cancelar QR |

---

## 4. Estados de un QR

| Estado | Significado |
|--------|-------------|
| `active` | QR vigente, esperando pago |
| `used` | Pago recibido (completado) |
| `cancelled` | Anulado manualmente |
| `expired` | Vencido |

---

## 5. Endpoints

### 5.1 Generar QR de cobro

**`POST /qr/generate`** — requiere permiso `qr_generate`

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
| `amount` | number | ✅ | — | Monto a cobrar (mín. 0.01) |
| `currency` | string | ❌ | `BOB` | Moneda |
| `description` | string | ❌ | — | Concepto del cobro |
| `dueDate` | string | ❌ | `2025-12-31` | Vencimiento |
| `singleUse` | boolean | ❌ | `true` | QR de un solo uso |
| `modifyAmount` | boolean | ❌ | `false` | Permitir modificar monto al pagar |
| `transactionId` | string | ❌ | auto | **Tu ID de referencia** para identificar el QR en tu sistema |

**Respuesta (200):**

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

> `qrImage` es un PNG en base64 listo para mostrar al cliente.
>
> 💡 **Identifica el QR con tu `transactionId`:** si lo envías, el QR quedará asociado a ese ID en tu sistema y aparecerá en las respuestas (estado, pagos, listado). Si no lo envías, PAGUI genera uno automáticamente (`TXN...`).

---

### 5.2 Consultar estado del QR

**`GET /qr/:qrId/status`** — requiere permiso `qr_status`

```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001/status" \
  -H "X-API-Key: pg_..."
```

**Respuesta (200):**

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

> El cobro está **confirmado** cuando `status === "used"` y existe un `payment` con `status === "completed"`.
>
> 🔄 **Estado en vivo:** este endpoint consulta el estado en Baneco antes de responder, así que si el pago ya se hizo pero la sincronización aún no lo había detectado, aquí se refleja al momento (el QR pasa a `used` y aparece el `payment`).

---

### 5.3 Detalle del QR

**`GET /qr/:qrId`**

```bash
curl -X GET "http://localhost:3001/qr/2412271016000000001" \
  -H "X-API-Key: pg_..."
```

Devuelve los datos del QR junto con el historial de pagos (también consulta Baneco en vivo). **404** si no existe.

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

**`GET /qr/list`** — requiere permiso `qr_status`

Query params opcionales:

| Param | Descripción |
|-------|-------------|
| `page` | Página (default `1`) |
| `limit` | Resultados por página (default `20`) |
| `status` | Filtro: `active` / `used` / `cancelled` / `expired` |
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

**`DELETE /qr/:qrId`** (por URL) o **`DELETE /qr/cancelQR`** (por body) — requiere permiso `qr_cancel`

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

> Solo se puede cancelar un QR en estado `active`. Pagado o ya cancelado → **400**.

---

## 6. Errores

Formato de error:

```json
{
  "success": false,
  "error": "mensaje",
  "message": "mensaje"
}
```

| Código | Causa | Solución |
|--------|-------|----------|
| 400 | Validación o estado inválido (monto < 0.01, cancelar QR pagado) | Revisa el body y el estado |
| 401 | API Key ausente, inválida o expirada | Verifica el header `X-API-Key` |
| 403 | La API Key no tiene el permiso | Solicita una key con el permiso |
| 404 | QR no encontrado | Verifica el `qrId` |
| 429 | Rate limit (120 req/min) | Backoff exponencial |
| 500 | Error interno | Contacta a PAGUI |

---

## 7. Ejemplos

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

### JavaScript (Node.js) — con polling

```javascript
const API_KEY = 'pg_tu_api_key_aqui';
const BASE = 'http://localhost:3001';
const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };

async function generateQR(amount, description) {
  const res = await fetch(`${BASE}/qr/generate`, {
    method: 'POST', headers,
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
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timeout esperando el pago');
}

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

## 8. Buenas prácticas

1. **Seguridad:** guarda la API Key en variables de entorno o gestor de secretos. Nunca en el repositorio.
2. **Polling razonable:** consulta cada 5-10 s (respeta el rate limit de 120 req/min).
3. **Un QR por operación:** genera un QR nuevo por cada cobro; el `transactionId` cambia en cada llamada.
4. **Maneja timeouts:** define un máximo de espera y cancela el QR si vence.
5. **Confirma siempre el estado:** solo confirma una venta cuando `status === "used"` con pago `completed`.
6. **Permisos mínimos:** solicita únicamente los permisos que tu integración necesita.

---

## 9. Soporte

- **Swagger interactivo:** `{URL_BASE}/docs`
- **Soporte PAGUI:** *(canales a definir con el equipo comercial)*
