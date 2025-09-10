# 📡 Sistema de Eventos del Servidor (Server-Sent Events)

## 📋 Descripción

Sistema de eventos en tiempo real usando **Server-Sent Events (SSE)** para notificar a los clientes sobre cambios en sus cuentas y QRs. Cada cuenta tiene sus propios eventos y requiere autenticación por token.

## 🚀 Configuración

### **Endpoint Principal:**
```
# Para API Key:
GET /events/stream?api-key=YOUR_API_KEY

# Para JWT Token:
GET /events/stream?token=YOUR_JWT_TOKEN

# O usando Authorization header (JWT):
GET /events/stream
Authorization: Bearer YOUR_JWT_TOKEN
```

### **Autenticación:**
- **Token requerido**: API Key o JWT válido
- **Métodos soportados**:
  1. API Key: `?api-key=YOUR_API_KEY`
  2. JWT Token: `?token=YOUR_JWT_TOKEN`
  3. Authorization header: `Authorization: Bearer YOUR_JWT_TOKEN`
- **Tipos de token**:
  - **API Key**: Para aplicaciones y servicios (use `?api-key=`)
  - **JWT**: Para usuarios autenticados (use `?token=`)
- **Validación**: Token debe estar activo y no expirado
- **Alcance**: Solo eventos de la cuenta asociada al token

## 📊 Tipos de Eventos

### **1. Eventos de Conexión**

#### **`connection`** - Confirmación de conexión
```json
{
  "id": "welcome_conn_1234567890_abc123",
  "type": "connection",
  "data": {
    "message": "Conectado exitosamente a eventos de la cuenta",
    "accountId": 1,
    "userId": 5,
    "connectionId": "conn_1234567890_abc123",
    "authType": "apikey",
    "tokenSource": "query",
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

#### **`heartbeat`** - Latido cada 30 segundos
```json
{
  "id": "heartbeat_1705312800000",
  "type": "heartbeat",
  "data": {
    "timestamp": "2024-01-15T10:00:00.000Z",
    "connectionId": "conn_1234567890_abc123"
  }
}
```

### **2. Eventos de QR**

#### **`qr_created`** - Nuevo QR creado
```json
{
  "id": "qr_created_25090601016617035877",
  "type": "qr_created",
  "data": {
    "qrId": "25090601016617035877",
    "transactionId": "TXN_123456",
    "amount": 100.50,
    "currency": "BOB",
    "description": "Pago de servicios",
    "dueDate": "2024-01-15T23:59:59.000Z",
    "singleUse": true,
    "modifyAmount": false,
    "status": "active"
  }
}
```

#### **`qr_payment`** - Pago recibido en QR
```json
{
  "id": "qr_payment_TXN_123456",
  "type": "qr_payment",
  "data": {
    "qrId": "25090601016617035877",
    "transactionId": "TXN_123456",
    "amount": 100.50,
    "currency": "BOB",
    "senderName": "Juan Pérez",
    "senderDocumentId": "12345678",
    "senderAccount": "1234567890",
    "senderBankCode": "BANECO",
    "description": "Pago de servicios",
    "paymentDate": "2024-01-15T10:30:00.000Z",
    "paymentTime": "10:30:00",
    "singleUse": true,
    "newStatus": "used"
  }
}
```

#### **`qr_status_change`** - Cambio de estado de QR
```json
{
  "id": "qr_status_change_25090601016617035877_1705312800000",
  "type": "qr_status_change",
  "data": {
    "qrId": "25090601016617035877",
    "previousStatus": "active",
    "newStatus": "completed",
    "amount": 100.50,
    "currency": "BOB",
    "description": "Pago de servicios",
    "singleUse": true,
    "dueDate": "2024-01-15T23:59:59.000Z",
    "syncSource": "bank_api"
  }
}
```

### **3. Eventos de Cuenta**

#### **`account_balance_update`** - Actualización de balance
```json
{
  "id": "balance_update_1705312800000_1",
  "type": "account_balance_update",
  "data": {
    "accountId": 1,
    "movementType": "qr_payment",
    "amount": 100.50,
    "previousBalance": 1000.00,
    "newBalance": 1100.50,
    "previousAvailableBalance": 1000.00,
    "newAvailableBalance": 1100.50,
    "description": "Pago QR recibido",
    "qrId": "25090601016617035877",
    "transactionId": "TXN_123456",
    "currency": "BOB"
  }
}
```

## 🔧 Implementación del Cliente

### **JavaScript/TypeScript**

```javascript
// Método 1: Conectar usando API Key
const eventSource = new EventSource('/events/stream?api-key=YOUR_API_KEY');

// Método 2: Conectar usando JWT Token
const eventSource = new EventSource('/events/stream?token=YOUR_JWT_TOKEN');

// Método 3: Conectar usando Authorization header (JWT)
const eventSource = new EventSource('/events/stream', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

// Escuchar eventos de conexión
eventSource.addEventListener('connection', (event) => {
  const data = JSON.parse(event.data);
  console.log('Conectado:', data);
});

// Escuchar eventos de QR creado
eventSource.addEventListener('qr_created', (event) => {
  const data = JSON.parse(event.data);
  console.log('QR creado:', data);
  
  // Actualizar UI con nuevo QR
  updateQRList(data);
});

// Escuchar eventos de pago
eventSource.addEventListener('qr_payment', (event) => {
  const data = JSON.parse(event.data);
  console.log('Pago recibido:', data);
  
  // Mostrar notificación de pago
  showPaymentNotification(data);
  
  // Actualizar balance
  updateBalance(data.newBalance);
});

// Escuchar cambios de estado
eventSource.addEventListener('qr_status_change', (event) => {
  const data = JSON.parse(event.data);
  console.log('Estado cambiado:', data);
  
  // Actualizar estado del QR en UI
  updateQRStatus(data.qrId, data.newStatus);
});

// Escuchar actualizaciones de balance
eventSource.addEventListener('account_balance_update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Balance actualizado:', data);
  
  // Actualizar balance en UI
  updateBalanceDisplay(data.newBalance);
});

// Escuchar latidos
eventSource.addEventListener('heartbeat', (event) => {
  const data = JSON.parse(event.data);
  console.log('Latido:', data.timestamp);
});

// Manejar errores
eventSource.onerror = (error) => {
  console.error('Error en conexión SSE:', error);
  
  // Reconectar después de 5 segundos
  setTimeout(() => {
    eventSource.close();
    // Reconectar...
  }, 5000);
};

// Cerrar conexión
eventSource.close();
```

### **React Hook**

```typescript
import { useEffect, useState } from 'react';

interface SSEEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export function useSSEEvents(token: string) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource(`/events/stream?token=${token}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Error de conexión');
    };

    // Escuchar todos los eventos
    const handleEvent = (event: MessageEvent) => {
      const eventData: SSEEvent = {
        id: event.lastEventId,
        type: event.type,
        data: JSON.parse(event.data),
        timestamp: new Date().toISOString()
      };
      
      setEvents(prev => [...prev, eventData]);
    };

    // Agregar listeners para cada tipo de evento
    ['connection', 'heartbeat', 'qr_created', 'qr_payment', 'qr_status_change', 'account_balance_update'].forEach(type => {
      eventSource.addEventListener(type, handleEvent);
    });

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [token]);

  return { events, isConnected, error };
}
```

### **Vue.js Composable**

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useSSEEvents(token: string) {
  const events = ref<any[]>([]);
  const isConnected = ref(false);
  const error = ref<string | null>(null);
  let eventSource: EventSource | null = null;

  const connect = () => {
    if (!token) return;

    eventSource = new EventSource(`/events/stream?token=${token}`);

    eventSource.onopen = () => {
      isConnected.value = true;
      error.value = null;
    };

    eventSource.onerror = () => {
      isConnected.value = false;
      error.value = 'Error de conexión';
    };

    const handleEvent = (event: MessageEvent) => {
      const eventData = {
        id: event.lastEventId,
        type: event.type,
        data: JSON.parse(event.data),
        timestamp: new Date().toISOString()
      };
      
      events.value.push(eventData);
    };

    ['connection', 'heartbeat', 'qr_created', 'qr_payment', 'qr_status_change', 'account_balance_update'].forEach(type => {
      eventSource!.addEventListener(type, handleEvent);
    });
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      isConnected.value = false;
    }
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return { events, isConnected, error, connect, disconnect };
}
```

## 📈 Monitoreo y Estadísticas

### **Endpoint de Estadísticas:**
```
GET /events/stats?token=YOUR_API_KEY
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Estadísticas de eventos obtenidas",
  "data": {
    "totalConnections": 5,
    "accountsWithSubscriptions": 3,
    "subscriptionsByAccount": {
      "1": 2,
      "2": 1,
      "3": 2
    },
    "yourAccountId": 1,
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

## 🛡️ Características de Seguridad

### **✅ Autenticación:**
- Token requerido para todas las conexiones
- Validación de token en cada conexión
- Solo eventos de la cuenta asociada al token

### **✅ Aislamiento:**
- Cada cuenta recibe solo sus propios eventos
- No hay fuga de información entre cuentas
- Conexiones independientes por cuenta

### **✅ Robustez:**
- Reconexión automática en caso de fallos
- Heartbeat cada 30 segundos
- Limpieza automática de conexiones cerradas

## 🔍 Troubleshooting

### **Problemas Comunes:**

#### **Conexión rechazada (401):**
```bash
# Verificar token
curl -H "Authorization: Bearer YOUR_TOKEN" /api/events/stats
```

#### **Conexión se cierra:**
```javascript
// Verificar reconexión automática
eventSource.onerror = (error) => {
  console.log('Reconectando en 5 segundos...');
  setTimeout(() => {
    eventSource.close();
    // Reconectar
  }, 5000);
};
```

#### **No se reciben eventos:**
```bash
# Verificar estadísticas
curl "/api/events/stats?token=YOUR_TOKEN"
```

## 🎯 Casos de Uso

### **1. Dashboard en Tiempo Real:**
- Actualización automática de balance
- Notificaciones de pagos recibidos
- Estado de QRs en tiempo real

### **2. Aplicación Móvil:**
- Notificaciones push de pagos
- Sincronización automática de datos
- Estado de transacciones

### **3. Sistema de Monitoreo:**
- Alertas de transacciones importantes
- Monitoreo de actividad de cuenta
- Logs de eventos en tiempo real

## 🚀 Producción

### **Configuración Nginx:**
```nginx
location /events/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_buffering off;
    proxy_cache off;
}
```

### **Configuración Load Balancer:**
- Sticky sessions para SSE
- Health checks para conexiones
- Timeout configurado apropiadamente

¡El sistema de eventos SSE está listo para proporcionar actualizaciones en tiempo real! 🎉
