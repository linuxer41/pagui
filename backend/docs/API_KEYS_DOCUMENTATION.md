# Documentación de API Keys

## Descripción General

Las API Keys son una forma de autenticación alternativa a los tokens JWT que permite a las aplicaciones integrarse con la API de manera segura. Cada API Key está asociada a una empresa específica y tiene permisos granulares para diferentes operaciones.

## Estructura de una API Key

```json
{
  "id": 1,
  "apiKey": "rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8",
  "description": "API Key de demostración",
  "companyId": 1,
  "permissions": {
    "qr_codes": {
      "create": true,
      "read": true
    },
    "transactions": {
      "read": true
    }
  },
  "expiresAt": "2026-08-27T10:48:35.644Z",
  "status": "active",
  "createdAt": "2025-08-27T10:48:35.644Z"
}
```

## Autenticación con API Keys

Para usar una API Key, inclúyela en el encabezado `X-API-Key` de todas las peticiones:

```bash
curl -H "X-API-Key: rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8" \
     -H "Content-Type: application/json" \
     https://api.example.com/api/qr/generate
```

## Endpoints Disponibles

### 1. Generar Código QR

**Endpoint:** `POST /api/qr/generate`

**Permisos requeridos:** `qr_codes.create`

**Descripción:** Genera un código QR para cobro usando la API Key.

**Ejemplo de uso:**

```bash
curl -X POST "http://localhost:3000/api/qr/generate" \
  -H "X-API-Key: rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN-001-2025",
    "amount": 150.50,
    "description": "Pago de servicios",
    "dueDate": "2025-12-31",
    "singleUse": true,
    "modifyAmount": false
  }'
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "QR generado exitosamente",
  "data": {
    "qrId": "2412271016000000001",
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "transactionId": "TXN-001-2025",
    "amount": 150.50,
    "currency": "BOB",
    "description": "Pago de servicios",
    "dueDate": "2025-12-31",
    "singleUse": true,
    "modifyAmount": false,
    "status": "active"
  }
}
```

### 2. Verificar Estado de QR

**Endpoint:** `GET /api/qr/{qrId}/status`

**Permisos requeridos:** `qr_codes.read`

**Descripción:** Verifica el estado actual de un código QR.

**Ejemplo de uso:**

```bash
curl -X GET "http://localhost:3000/api/qr/2412271016000000001/status" \
  -H "X-API-Key: rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8"
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Estado del QR verificado",
  "data": {
    "statusQRCode": 0,
    "payment": []
  }
}
```

**Códigos de estado:**
- `0`: Activo, pendiente de pago
- `1`: Pagado
- `9`: Anulado
- `10`: Expirado

### 3. Obtener Estadísticas de Transacciones

**Endpoint:** `GET /api/transactions/stats/{periodType}/{year}/{month?}/{week?}`

**Permisos requeridos:** `transactions.read`

**Descripción:** Obtiene estadísticas de transacciones por período.

**Ejemplo de uso:**

```bash
# Estadísticas mensuales
curl -X GET "http://localhost:3000/api/transactions/stats/monthly/2025/8" \
  -H "X-API-Key: rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8"

# Estadísticas semanales
curl -X GET "http://localhost:3000/api/transactions/stats/weekly/2025/8/3" \
  -H "X-API-Key: rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8"

# Estadísticas anuales
curl -X GET "http://localhost:3000/api/transactions/stats/yearly/2025" \
  -H "X-API-Key: rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8"
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "period": "2025-08",
    "totalTransactions": 45,
    "totalAmount": 12500.75,
    "pendingTransactions": 12,
    "completedTransactions": 33,
    "averageAmount": 277.79
  }
}
```

### 4. Listar Transacciones

**Endpoint:** `GET /api/transactions`

**Permisos requeridos:** `transactions.read`

**Descripción:** Lista transacciones con filtros opcionales.

**Ejemplo de uso:**

```bash
curl -X GET "http://localhost:3000/api/transactions?status=completed&startDate=2025-08-01&endDate=2025-08-31" \
  -H "X-API-Key: rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8"
```

**Parámetros de consulta:**
- `status`: Estado de la transacción (pending, completed, failed, cancelled)
- `startDate`: Fecha de inicio (YYYY-MM-DD)
- `endDate`: Fecha de fin (YYYY-MM-DD)
- `type`: Tipo de transacción (incoming, outgoing)
- `limit`: Límite de resultados (por defecto 50)
- `offset`: Desplazamiento para paginación

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Transacciones listadas exitosamente",
  "data": {
    "transactions": [
      {
        "id": 1,
        "qrId": "2412271016000000001",
        "transactionId": "TXN-001-2025",
        "amount": 150.50,
        "currency": "BOB",
        "type": "incoming",
        "status": "completed",
        "paymentDate": "2025-08-27T10:30:00Z",
        "senderName": "Juan Pérez",
        "description": "Pago de servicios"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

## Gestión de API Keys

### Crear Nueva API Key

**Endpoint:** `POST /api/api-keys`

**Permisos requeridos:** JWT de administrador de empresa

**Ejemplo de uso:**

```bash
curl -X POST "http://localhost:3000/api/api-keys" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "API Key para integración móvil",
    "permissions": {
      "qr_codes": {
        "create": true,
        "read": true
      },
      "transactions": {
        "read": true
      }
    },
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "API Key creada exitosamente",
  "data": {
    "id": 2,
    "apiKey": "nEwApIkEy1234567890abcdefghijklmnopqrstuvwxyz",
    "description": "API Key para integración móvil",
    "permissions": {
      "qr_codes": {
        "create": true,
        "read": true
      },
      "transactions": {
        "read": true
      }
    },
    "expiresAt": "2026-12-31T23:59:59Z",
    "status": "active"
  }
}
```

### Listar API Keys

**Endpoint:** `GET /api/api-keys`

**Permisos requeridos:** JWT de administrador de empresa

**Ejemplo de uso:**

```bash
curl -X GET "http://localhost:3000/api/api-keys" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Revocar API Key

**Endpoint:** `DELETE /api/api-keys/{apiKeyId}`

**Permisos requeridos:** JWT de administrador de empresa

**Ejemplo de uso:**

```bash
curl -X DELETE "http://localhost:3000/api/api-keys/2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Permisos Disponibles

### Estructura de Permisos

```json
{
  "qr_codes": {
    "create": true,    // Generar códigos QR
    "read": true,      // Leer estado de QR
    "update": false,   // Modificar QR (no implementado)
    "delete": false    // Cancelar QR (no implementado)
  },
  "transactions": {
    "read": true,      // Leer transacciones
    "create": false,   // Crear transacciones (no implementado)
    "update": false,   // Modificar transacciones (no implementado)
    "delete": false    // Eliminar transacciones (no implementado)
  },
  "companies": {
    "read": false,     // Leer información de empresa
    "update": false    // Modificar empresa (no implementado)
  }
}
```

### Permisos por Rol

| Rol | qr_codes.create | qr_codes.read | transactions.read | companies.read |
|-----|----------------|---------------|-------------------|----------------|
| COMPANY_ADMIN | ✅ | ✅ | ✅ | ✅ |
| FINANCIAL_MANAGER | ❌ | ✅ | ✅ | ✅ |
| OPERATOR | ✅ | ✅ | ❌ | ❌ |

## Casos de Uso Comunes

### 1. Integración de Aplicación Móvil

```bash
# Configurar API Key con permisos mínimos
curl -X POST "http://localhost:3000/api/api-keys" \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "App móvil - Solo generación de QR",
    "permissions": {
      "qr_codes": {
        "create": true,
        "read": true
      }
    },
    "expiresAt": "2026-12-31T23:59:59Z"
  }'

# Usar API Key para generar QR
curl -X POST "http://localhost:3000/api/qr/generate" \
  -H "X-API-Key: MOBILE_APP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "MOBILE-TXN-001",
    "amount": 75.00,
    "description": "Pago desde app móvil"
  }'
```

### 2. Dashboard de Monitoreo

```bash
# Configurar API Key para dashboard
curl -X POST "http://localhost:3000/api/api-keys" \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Dashboard - Solo lectura",
    "permissions": {
      "qr_codes": {
        "read": true
      },
      "transactions": {
        "read": true
      }
    },
    "expiresAt": "2026-12-31T23:59:59Z"
  }'

# Obtener estadísticas para dashboard
curl -X GET "http://localhost:3000/api/transactions/stats/monthly/2025/8" \
  -H "X-API-Key: DASHBOARD_API_KEY"
```

### 3. Integración con Sistema de Facturación

```bash
# Configurar API Key para facturación
curl -X POST "http://localhost:3000/api/api-keys" \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Sistema de facturación",
    "permissions": {
      "qr_codes": {
        "create": true,
        "read": true
      },
      "transactions": {
        "read": true
      }
    },
    "expiresAt": "2026-12-31T23:59:59Z"
  }'

# Generar QR automáticamente al crear factura
curl -X POST "http://localhost:3000/api/qr/generate" \
  -H "X-API-Key: BILLING_SYSTEM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "INV-2025-001",
    "amount": 250.00,
    "description": "Factura INV-2025-001",
    "dueDate": "2025-09-30"
  }'
```

## Manejo de Errores

### Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 401 | API Key inválida o expirada | Verificar que la API Key sea correcta y no haya expirado |
| 403 | Permisos insuficientes | Verificar que la API Key tenga los permisos necesarios |
| 404 | Recurso no encontrado | Verificar que el ID del recurso sea correcto |
| 429 | Límite de rate limit excedido | Reducir la frecuencia de peticiones |
| 500 | Error interno del servidor | Contactar al soporte técnico |

### Ejemplo de Respuesta de Error

```json
{
  "success": false,
  "message": "API Key no tiene permisos para generar QR",
  "error": {
    "code": "FORBIDDEN",
    "details": "Se requieren permisos de qr_codes.create"
  }
}
```

## Seguridad y Mejores Prácticas

### 1. Almacenamiento Seguro
- Nunca almacenes API Keys en código fuente
- Usa variables de entorno o gestores de secretos
- Rota las API Keys regularmente

### 2. Permisos Mínimos
- Asigna solo los permisos necesarios
- Revisa y actualiza permisos regularmente
- Usa diferentes API Keys para diferentes propósitos

### 3. Monitoreo
- Revisa el uso de API Keys regularmente
- Configura alertas para uso anómalo
- Revoca API Keys no utilizadas

### 4. Rate Limiting
- Respeta los límites de peticiones
- Implementa reintentos con backoff exponencial
- Cachea respuestas cuando sea posible

## Ejemplos de Implementación

### JavaScript/Node.js

```javascript
class QRPaymentAPI {
  constructor(apiKey, baseURL = 'http://localhost:3000/api') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generate(transactionData) {
    const response = await fetch(`${this.baseURL}/qr/generate`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async checkQRStatus(qrId) {
    const response = await fetch(`${this.baseURL}/qr/${qrId}/status`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

// Uso
const api = new QRPaymentAPI('YOUR_API_KEY');
const qr = await api.generate({
  transactionId: 'TXN-001',
  amount: 100.00,
  description: 'Pago de prueba'
});
```

### Python

```python
import requests
import json

class QRPaymentAPI:
    def __init__(self, api_key, base_url='http://localhost:3000/api'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def generate_qr(self, transaction_data):
        url = f"{self.base_url}/qr/generate"
        response = requests.post(url, headers=self.headers, json=transaction_data)
        response.raise_for_status()
        return response.json()
    
    def check_qr_status(self, qr_id):
        url = f"{self.base_url}/qr/{qr_id}/status"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

# Uso
api = QRPaymentAPI('YOUR_API_KEY')
qr = api.generate_qr({
    'transactionId': 'TXN-001',
    'amount': 100.00,
    'description': 'Pago de prueba'
})
```

### cURL

```bash
#!/bin/bash

API_KEY="YOUR_API_KEY"
BASE_URL="http://localhost:3000/api"

# Generar QR
generate_qr() {
    local transaction_id=$1
    local amount=$2
    local description=$3
    
    curl -X POST "${BASE_URL}/qr/generate" \
        -H "X-API-Key: ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"transactionId\": \"${transaction_id}\",
            \"amount\": ${amount},
            \"description\": \"${description}\"
        }"
}

# Verificar estado de QR
check_qr_status() {
    local qr_id=$1
    
    curl -X GET "${BASE_URL}/qr/${qr_id}/status" \
        -H "X-API-Key: ${API_KEY}"
}

# Ejemplos de uso
generate_qr "TXN-001" 100.00 "Pago de prueba"
check_qr_status "2412271016000000001"
```

## Conclusión

Las API Keys proporcionan una forma segura y flexible de integrar aplicaciones externas con la API de pagos QR. Siguiendo las mejores prácticas de seguridad y usando los permisos apropiados, puedes crear integraciones robustas y seguras.

Para más información o soporte técnico, consulta la documentación completa de la API o contacta al equipo de desarrollo.
