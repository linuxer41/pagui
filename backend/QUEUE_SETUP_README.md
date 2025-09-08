# 🚀 Sistema de Colas de Sincronización de Pagos

## 📋 Descripción

Sistema de colas robusto usando **BullMQ** y **Redis** para manejar la sincronización de pagos de manera asíncrona y escalable.

## 🏗️ Arquitectura

### **Componentes:**

1. **PaymentQueueService**: Servicio principal de colas
2. **BullMQ**: Sistema de colas con Redis
3. **Workers**: Procesadores de trabajos en background
4. **Auto-scheduling**: Programación automática de verificaciones

### **Flujo de Trabajo:**

```
Crear QR → Agregar a Cola → Worker Procesa → Verificar Estado → Programar Próxima Verificación
```

## ⚙️ Instalación

### **1. Instalar Dependencias:**

```bash
bun add bullmq ioredis
bun add -d @types/ioredis
```

### **2. Configurar Redis:**

#### **Opción A: Redis Local**
```bash
# Windows (con Chocolatey)
choco install redis-64

# macOS (con Homebrew)
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server
```

#### **Opción B: Redis en Docker**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

#### **Opción C: Redis Cloud (Producción)**
- Crear cuenta en [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)
- Obtener URL de conexión

### **3. Variables de Entorno:**

Agregar al archivo `.env`:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Payment Sync Configuration
PAYMENT_SYNC_INTERVAL=5
```

### **Ejemplos de REDIS_URL:**

```env
# Redis local (desarrollo)
REDIS_URL=redis://localhost:6379

# Redis con contraseña
REDIS_URL=redis://:password@localhost:6379

# Redis con usuario y contraseña
REDIS_URL=redis://username:password@localhost:6379

# Redis en puerto diferente
REDIS_URL=redis://localhost:6380

# Redis con base de datos específica
REDIS_URL=redis://localhost:6379/1

# Redis Cloud (producción)
REDIS_URL=redis://username:password@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
```

## 🚀 Uso

### **Inicio Automático:**

El sistema se inicia automáticamente con la aplicación Elysia:

```bash
bun run src/index.ts
```

### **Logs del Sistema:**

```bash
🔄 Iniciando sistema de colas de sincronización de pagos...
🧹 Trabajo de limpieza diaria programado
🚀 Servidor iniciado en http://localhost:3000
🔄 Sistema de colas de pagos activo
📋 Trabajo de sincronización agregado para QR: 25090601016617035877
🔄 Procesando sincronización de QR: 25090601016617035877 (intento 1/3)
✅ Sincronización exitosa para QR: 25090601016617035877
⏰ Próxima verificación programada para QR 25090601016617035877 en 2 minutos
```

## 📊 Características

### **✅ Auto-scheduling Inteligente:**

| Estado del QR | Próxima Verificación | Prioridad |
|---------------|---------------------|-----------|
| **pending** | 2 minutos | Alta |
| **processing** | 5 minutos | Media |
| **active** | 15 minutos | Baja |
| **completed/cancelled/expired** | No más verificaciones | - |

### **✅ Reintentos Automáticos:**

- **3 intentos** por defecto
- **Backoff exponencial**: 2s, 4s, 8s
- **Máximo 20 verificaciones** por QR
- **Limpieza automática** de trabajos antiguos

### **✅ Escalabilidad:**

- **5 workers concurrentes** por defecto
- **Procesamiento en lotes**
- **Persistencia en Redis**
- **Monitoreo en tiempo real**

## 🔧 Configuración Avanzada

### **Personalizar Workers:**

```typescript
// En payment-queue.service.ts
this.paymentSyncWorker = new Worker<PaymentSyncJobData>(
  'payment-sync',
  this.processPaymentSyncJob.bind(this),
  {
    connection: this.redis,
    concurrency: 10, // Aumentar para más throughput
  }
);
```

### **Personalizar Reintentos:**

```typescript
// En el método addPaymentSyncJob
const jobOptions = {
  attempts: 5, // Más intentos
  backoff: {
    type: 'exponential',
    delay: 1000, // 1 segundo inicial
  },
};
```

### **Personalizar Limpieza:**

```typescript
// En el constructor
defaultJobOptions: {
  removeOnComplete: 200, // Mantener más trabajos completados
  removeOnFail: 100,     // Mantener más trabajos fallidos
}
```

## 📈 Monitoreo

### **Estadísticas de Cola:**

```typescript
const stats = await paymentQueueService.getQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 8
// }
```

### **Redis CLI:**

```bash
# Conectar a Redis
redis-cli

# Ver todas las claves
KEYS *

# Ver trabajos en cola
LLEN bull:payment-sync:waiting

# Ver trabajos activos
LLEN bull:payment-sync:active
```

### **RedisInsight (GUI):**

- Descargar [RedisInsight](https://redis.com/redis-enterprise/redis-insight/)
- Conectar a tu instancia Redis
- Monitorear colas en tiempo real

## 🛡️ Beneficios vs Sistema Anterior

### **✅ Ventajas del Sistema de Colas:**

| Característica | Sistema Anterior | Sistema de Colas |
|----------------|------------------|------------------|
| **Escalabilidad** | Limitada | Alta |
| **Persistencia** | No | Sí (Redis) |
| **Reintentos** | Manual | Automático |
| **Monitoreo** | Básico | Avanzado |
| **Auto-scheduling** | Intervalos fijos | Inteligente |
| **Recuperación** | No | Sí (después de fallos) |

### **✅ Casos de Uso Mejorados:**

1. **Alto Volumen**: Maneja miles de QRs simultáneamente
2. **Fallos de Red**: Reintenta automáticamente
3. **Restart de App**: Recupera trabajos pendientes
4. **Múltiples Instancias**: Distribuye carga entre workers
5. **Monitoreo**: Métricas detalladas en tiempo real

## 🔍 Troubleshooting

### **Problemas Comunes:**

#### **Redis no disponible:**
```bash
# Verificar Redis
redis-cli ping
# Debe responder: PONG

# Iniciar Redis
redis-server
```

#### **Trabajos no se procesan:**
```bash
# Verificar workers
redis-cli
LLEN bull:payment-sync:waiting
LLEN bull:payment-sync:active
```

#### **Alto uso de memoria:**
```bash
# Limpiar trabajos antiguos
redis-cli
DEL bull:payment-sync:completed
DEL bull:payment-sync:failed
```

### **Comandos de Diagnóstico:**

```bash
# Ver estado de Redis
redis-cli INFO memory

# Ver trabajos pendientes
redis-cli LLEN bull:payment-sync:waiting

# Ver logs de la aplicación
tail -f logs/app.log | grep "payment-sync"
```

## 🎯 Flujo Completo

```mermaid
graph TD
    A[Usuario Crea QR] --> B[QR Guardado en DB]
    B --> C[Agregar a Cola de Sincronización]
    C --> D[Worker Procesa Trabajo]
    D --> E[Verificar Estado con Banco]
    E --> F{¿Estado Cambió?}
    F -->|Sí| G[Actualizar Estado en DB]
    F -->|No| H[Programar Próxima Verificación]
    G --> I[Crear Movimiento de Cuenta]
    I --> H
    H --> J{¿QR Finalizado?}
    J -->|No| K[Agregar Nuevo Trabajo con Delay]
    J -->|Sí| L[Fin del Proceso]
    K --> D
```

## 🚀 Producción

### **Configuración para Producción:**

```env
# Redis Cloud o Redis Enterprise
REDIS_URL=redis://username:password@your-redis-host.com:6379

# Optimizaciones
PAYMENT_SYNC_INTERVAL=3
```

### **Monitoreo en Producción:**

- **Redis Cloud Dashboard**: Métricas en tiempo real
- **Application Logs**: Logs estructurados
- **Health Checks**: Endpoints de monitoreo
- **Alertas**: Notificaciones por fallos

¡El sistema está listo para manejar sincronización de pagos a escala! 🎉
