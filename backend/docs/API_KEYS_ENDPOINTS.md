# Endpoints de API Keys

## Descripción
Endpoints para que los usuarios principales puedan crear, listar y revocar sus propias API keys.

## Autenticación
Todos los endpoints requieren autenticación JWT válida.

## Endpoints Disponibles

### 1. Crear API Key
**POST** `/apikeys`

Crea una nueva API key para el usuario autenticado.

**Body:**
```json
{
  "description": "API Key para integración",
  "permissions": {
    "qr_generate": true,
    "qr_status": true,
    "qr_cancel": false
  },
  "expiresAt": "2025-12-31T23:59:59Z" // Opcional
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "API key creada exitosamente",
  "data": {
    "id": 1,
    "apiKey": "rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8",
    "description": "API Key para integración",
    "permissions": {
      "qr_generate": true,
      "qr_status": true,
      "qr_cancel": false
    },
    "userId": 1,
    "expiresAt": "2025-12-31T23:59:59Z",
    "status": "active",
    "createdAt": "2025-01-27T10:00:00Z"
  }
}
```

### 2. Listar API Keys
**GET** `/apikeys`

Lista todas las API keys del usuario autenticado (sin paginación).

**Respuesta:**
```json
{
  "success": true,
  "message": "API keys listadas exitosamente",
  "data": {
    "apiKeys": [
      {
        "id": 1,
        "apiKey": "rJ4TWnSFDOHbfHqzL106g6Skzg2PHEc8",
        "description": "API Key para integración",
        "permissions": {
          "qr_generate": true,
          "qr_status": true,
          "qr_cancel": false
        },
        "expiresAt": "2025-12-31T23:59:59Z",
        "status": "active",
        "createdAt": "2025-01-27T10:00:00Z"
      }
    ]
  }
}
```

### 3. Revocar API Key
**DELETE** `/apikeys/:id`

Revoca una API key específica del usuario autenticado.

**Parámetros:**
- `id`: ID de la API key a revocar

**Respuesta:**
```json
{
  "success": true,
  "message": "API key revocada exitosamente",
  "data": {
    "id": 1,
    "responseCode": 0,
    "message": "API key revocada exitosamente"
  }
}
```

## Permisos Disponibles

- **qr_generate**: Permite generar códigos QR
- **qr_status**: Permite consultar el estado de códigos QR
- **qr_cancel**: Permite cancelar códigos QR

## Notas Importantes

- Las API keys solo pueden ser creadas, listadas y revocadas por su propietario
- No se pueden actualizar las API keys existentes
- Las API keys expiradas se marcan automáticamente como "EXPIRED"
- Todas las operaciones se registran en el sistema de auditoría
