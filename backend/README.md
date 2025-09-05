# 🚀 PAGUI Backend API

Sistema backend para generación y gestión de códigos QR de pago, integrado con Banco Económico de Bolivia.

## 📋 **Tabla de Contenidos**

- [🏗️ Arquitectura del Sistema](#-arquitectura-del-sistema)
- [🔐 Sistema de Autenticación](#-sistema-de-autenticación)
- [📱 Generación de Códigos QR](#-generación-de-códigos-qr)
- [💳 Notificaciones de Pago](#-notificaciones-de-pago)
- [🗄️ Base de Datos](#-base-de-datos)
- [🚀 Instalación y Configuración](#-instalación-y-configuración)
- [🧪 Pruebas](#-pruebas)
- [📖 API Endpoints](#-api-endpoints)
- [🔧 Configuración](#-configuración)

---

## 🏗️ **Arquitectura del Sistema**

### **Tecnologías Utilizadas**
- **Runtime**: Bun (JavaScript/TypeScript)
- **Framework**: Elysia.js (Fast, lightweight web framework)
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT (JSON Web Tokens)
- **Integración Bancaria**: API Banco Económico
- **Documentación**: Swagger/OpenAPI

### **Estructura del Proyecto**
```
src/
├── config/          # Configuración de base de datos
├── middlewares/     # Middlewares de autenticación
├── routes/          # Definición de rutas API
├── services/        # Lógica de negocio
├── schemas/         # Esquemas de validación
└── utils/           # Utilidades y helpers
```

---

## 🔐 **Sistema de Autenticación**

### **Flujo de Autenticación**

1. **Login del Usuario**
   ```typescript
   POST /auth/login
   {
     "email": "usuario@ejemplo.com",
     "password": "contraseña123"
   }
   ```

2. **Respuesta del Servidor**
   ```json
   {
     "success": true,
     "message": "Usuario autenticado exitosamente",
     "data": {
       "user": {
         "id": 1,
         "email": "usuario@ejemplo.com",
         "fullName": "Usuario Ejemplo",
         "roleName": "SUPER_ADMIN",
         "entityType": "individual"
       },
       "accessToken": "eyJhbGciOiJIUzI1NiIs...",
       "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
     }
   }
   ```

3. **Uso del Token**
   ```typescript
   // Incluir en headers de peticiones protegidas
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```

### **Tipos de Usuarios y Roles**

- **SUPER_ADMIN**: Acceso total al sistema
- **ADMIN**: Administrador de empresa
- **USER**: Usuario estándar

### **Middleware de Autenticación**

```typescript
// Proteger ruta con autenticación JWT
.use(authMiddleware({ type: 'jwt', level: 'user' }))

// Proteger ruta con autenticación API Key
.use(authMiddleware({ type: 'apikey', level: 'user' }))

// Proteger ruta con ambos tipos de autenticación
.use(authMiddleware({ type: 'all', level: 'admin' }))
```

### **Gestión de Tokens JWT**

**Cambios Recientes:**
- ❌ **Eliminado**: Campo `expires_at` de la base de datos
- ✅ **Implementado**: Verificación automática de expiración mediante decodificación JWT
- 🔒 **Seguridad**: Los tokens solo se pueden revocar desde la base de datos

**Funcionalidades:**
- **Verificación automática**: Los tokens JWT se verifican automáticamente por expiración
- **Revocación selectiva**: Se pueden revocar tokens específicos o todos los tokens de un usuario
- **Persistencia**: Los tokens válidos se mantienen en la base de datos hasta ser revocados

**Métodos disponibles:**
```typescript
// Revocar un token específico
await authService.revokeAccessToken(token);
await authService.revokeRefreshToken(token);

// Revocar todos los tokens de un usuario
await authService.revokeAllUserTokens(userId);

// Verificar si un token está revocado
const isValid = await authService.verifyToken(token);
```

---

## 📱 **Generación de Códigos QR**

### **Flujo de Generación de QR**

1. **Autenticación del Usuario**
   - Verificar token JWT válido
   - Obtener información del usuario y empresa

2. **Validación de Datos**
   ```typescript
   {
     "transactionId": "TXN-12345",     // ✅ REQUERIDO
     "amount": 100.50,                 // ✅ REQUERIDO
     "description": "Pago de servicios", // ❌ OPCIONAL
     "bankId": 1,                      // ❌ OPCIONAL (default: 1)
     "dueDate": "2025-12-31",          // ❌ OPCIONAL
     "singleUse": true,                // ❌ OPCIONAL (default: false)
     "modifyAmount": false             // ❌ OPCIONAL (default: false)
   }
   ```

3. **Integración con Banco Económico**
   - Obtener credenciales bancarias
   - Autenticarse con API del banco
   - Generar QR a través de API externa

4. **Almacenamiento en Base de Datos**
   - Guardar información del QR generado
   - Registrar actividad del usuario
   - Retornar respuesta con QR ID e imagen

### **Ejemplo de Generación de QR**

```typescript
// 1. Obtener token de autenticación
const token = await loginUser(credentials);

// 2. Generar código QR
const qrResponse = await fetch('/qr/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    transactionId: `TXN-${Date.now()}`,
    amount: 150.00,
    description: 'Pago de factura',
    singleUse: true,
    modifyAmount: false
  })
});

// 3. Respuesta del servidor
const qrData = await qrResponse.json();
// {
//   "success": true,
//   "message": "QR generado exitosamente",
//   "data": {
//     "qrId": "QR123456789",
//     "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
//     "transactionId": "TXN-1234567890",
//     "amount": 150.00,
//     "status": "active"
//   }
// }
```

---

## 💳 **Notificaciones de Pago**

### **Webhooks de Banco Económico**

El sistema recibe notificaciones automáticas cuando se realizan pagos:

1. **Endpoint de Webhook**
   ```
   POST /hooks/notifyPaymentQR
   ```

2. **Datos de Notificación**
   ```json
   {
     "qrId": "QR123456789",
     "transactionId": "TXN-1234567890",
     "paymentDate": "2025-08-29",
     "paymentTime": "14:30:00",
     "amount": 150.00,
     "currency": "BOB",
     "senderBankCode": "1016",
     "senderName": "Juan Pérez",
     "senderDocumentId": "12345678",
     "senderAccount": "1234567890"
   }
   ```

3. **Procesamiento Automático**
   - Validar datos de notificación
   - Actualizar estado del QR
   - Registrar transacción de pago
   - Notificar al usuario (opcional)

---

## 🗄️ **Base de Datos**

### **Tablas Principales**

#### **users** - Usuarios del Sistema
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(20) NOT NULL, -- 'company' | 'individual'
  role_id INTEGER REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'active'
);
```

#### **qr_codes** - Códigos QR Generados
```sql
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### **third_bank_credentials** - Credenciales Bancarias
```sql
CREATE TABLE third_bank_credentials (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(50) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  encryption_key VARCHAR(255) NOT NULL,
  environment INTEGER NOT NULL, -- 1=test, 2=producción
  status VARCHAR(20) DEFAULT 'active'
);
```

---

## 🚀 **Instalación y Configuración**

### **Requisitos Previos**
- Node.js 18+ o Bun 1.0+
- PostgreSQL 12+
- Credenciales de Banco Económico

### **1. Clonar el Repositorio**
```bash
git clone <repository-url>
cd pagui-backend
```

### **2. Instalar Dependencias**
```bash
bun install
```

### **3. Configurar Variables de Entorno**
```bash
# Crear archivo .env
JWT_SECRET=tu-super-secret-jwt-key
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/pagui
NODE_ENV=development
```

### **4. Inicializar Base de Datos**
```bash
# Crear tablas
bun run init-db

# Poblar con datos de prueba
bun run seed-db
```

### **5. Iniciar Servidor**
```bash
# Desarrollo
bun run dev

# Producción
bun run start
```

---

## 🧪 **Pruebas**

### **Ejecutar Todas las Pruebas**
```bash
bun test
```

### **Pruebas Específicas**
```bash
# Solo autenticación
bun test test/auth.test.js

# Solo generación de QR
bun test test/qr/generation.test.js

# Solo health check
bun test test/health.test.js
```

### **Cobertura de Pruebas**
- ✅ **Autenticación**: Login, validación de tokens, roles
- ✅ **Health Check**: Estado del servidor y API
- ✅ **Generación de QR**: Creación, validación, cancelación
- ✅ **Notificaciones**: Webhooks de pago, validaciones

---

## 📖 **API Endpoints**

### **🔐 Autenticación**
```
POST   /auth/login              # Login de usuario
POST   /auth/forgot-password    # Solicitar reset de contraseña
POST   /auth/reset-password     # Resetear contraseña
POST   /auth/change-password    # Cambiar contraseña
```

### **📱 Generación de QR**
```
POST   /qr/generate    # Generar código QR
DELETE /qr/cancelQR       # Cancelar código QR
GET    /qr/:id/status     # Verificar estado de QR
GET    /qr/list           # Listar códigos QR
```

### **💳 Transacciones**
```
GET    /transactions            # Listar transacciones
GET    /transactions/:id        # Obtener transacción específica
POST   /transactions            # Crear transacción
```

### **👥 Usuarios (Admin)**
```
GET    /users                   # Listar usuarios
GET    /users/:id               # Obtener usuario específico
POST   /users                   # Crear usuario
PUT    /users/:id               # Actualizar usuario
DELETE /users/:id               # Eliminar usuario
```

### **🔗 Webhooks**
```
POST   /hooks/notifyPaymentQR   # Notificación de pago
POST   /hooks/baneco            # Webhook específico de Banco Económico
```

### **🏥 Health Check**
```
GET    /                        # Estado del servidor
GET    /health                  # Estado del sistema
GET    /health/api              # Estado de la API
```

---

## 🔧 **Configuración**

### **Configuración de Banco Económico**

Para que la generación de QR funcione, es necesario configurar las credenciales bancarias:

1. **Acceder a la base de datos**
2. **Insertar credenciales en `third_bank_credentials`**
3. **Configurar environment (1=test, 2=producción)**

```sql
INSERT INTO third_bank_credentials (
  account_number, username, password, encryption_key, 
  environment, status
) VALUES (
  '1234567890',           -- Número de cuenta
  'usuario_banco',        -- Usuario de API
  'contraseña_api',       -- Contraseña de API
  'clave_encripcion_32',  -- Clave de encriptación
  2,                      -- Environment (2=producción)
  'active'                -- Estado
);
```

### **Configuración de JWT**

```bash
# En archivo .env
JWT_SECRET=tu-super-secret-jwt-key-para-desarrollo
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu-refresh-secret-key
```

---

## 🚨 **Solución de Problemas**

### **Error 500 en Generación de QR**
- ✅ Verificar que existan credenciales bancarias en `third_bank_credentials`
- ✅ Verificar que el environment esté configurado correctamente
- ✅ Revisar logs del servidor para errores específicos

### **Error 401 Unauthorized**
- ✅ Verificar que el token JWT sea válido
- ✅ Verificar que el usuario tenga permisos para la ruta
- ✅ Verificar que el token no haya expirado

### **Error de Base de Datos**
- ✅ Verificar conexión a PostgreSQL
- ✅ Ejecutar `bun run init-db` para crear tablas
- ✅ Ejecutar `bun run seed-db` para datos de prueba

---

## 📞 **Soporte**

Para soporte técnico o preguntas sobre la implementación:

- **Documentación**: Este README
- **Swagger**: `http://localhost:3000/swagger`
- **Health Check**: `http://localhost:3000/health`

---

## 📄 **Licencia**

Este proyecto está bajo licencia [MIT](LICENSE).

---

*Documentación generada para PAGUI Backend API v2.0.0*