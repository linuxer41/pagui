# Endpoints de API Keys

## Descripción
Endpoints para que los usuarios principales puedan crear, listar y revocar API keys para sus billeteras de recaudación.

## Autenticación
Todos los endpoints requieren autenticación JWT válida (API interna, puerto `3000`). Prefijo de ruta: `/api`.

## Endpoints Disponibles

### 1. Crear API Key
**POST** `/api/api-keys`

Crea una nueva API key para una billetera de recaudación del usuario autenticado.

**Body:**
```json
{
  "walletId": "2442123456789000001",
  "description": "API Key para integración",
  "permissions": {
    "qr_generate": true,
    "qr_status": true,
    "qr_cancel": false
  },
  "expiresAt": "2027-12-31T23:59:59Z"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "API key generada exitosamente",
  "data": {
    "id": 2442123456789000001,
    "apiKey": "pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC",
    "walletId": 2442123456789000001,
    "description": "API Key para integración",
    "permissions": {
      "qr_generate": true,
      "qr_status": true,
      "qr_cancel": false
    },
    "expiresAt": "2027-12-31T23:59:59.000Z",
    "status": "active",
    "createdAt": "2026-01-27T10:00:00.000Z",
    "updatedAt": "2026-01-27T10:00:00.000Z"
  }
}
```

> ⚠️ `data.apiKey` solo se devuelve al crear. Guárdala en ese momento.

### 2. Listar API Keys
**GET** `/api/api-keys?walletId=2442123456789000001`

Lista las API keys activas de la billetera de recaudación (sin paginación).

**Respuesta:**
```json
{
  "success": true,
  "message": "API keys listadas exitosamente",
  "data": [
    {
      "id": 2442123456789000001,
      "apiKey": "pg_AbC3dEfGhIjKlMnOpQrStUvWxYz0123456789AbC",
      "walletId": 2442123456789000001,
      "description": "API Key para integración",
      "permissions": {
        "qr_generate": true,
        "qr_status": true,
        "qr_cancel": false
      },
      "expiresAt": "2027-12-31T23:59:59.000Z",
      "status": "active",
      "createdAt": "2026-01-27T10:00:00.000Z",
      "updatedAt": "2026-01-27T10:00:00.000Z"
    }
  ]
}
```

### 3. Revocar API Key
**DELETE** `/api/api-keys/:id`

Revoca una API key específica de la billetera del usuario autenticado.

**Parámetros:**
- `id`: ID de la API key a revocar

**Respuesta:**
```json
{
  "success": true,
  "message": "API key revocada"
}
```

## Permisos Disponibles

- **qr_generate**: Permite generar códigos QR
- **qr_status**: Permite consultar el estado y listar códigos QR
- **qr_cancel**: Permite cancelar códigos QR

## Notas Importantes

- Las API keys solo pueden ser creadas, listadas y revocadas por el propietario de la billetera de recaudación
- No se pueden actualizar las API keys existentes; se revocan y se crean nuevas
- Las API keys expiradas se marcan automáticamente como `EXPIRED`
- La API Pública (puerto `3001`) consume estas claves vía header `X-API-Key`
- Todas las operaciones se registran en el sistema de auditoría
