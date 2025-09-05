# Tests de API Keys

## Descripción
Este directorio contiene las pruebas automatizadas para los endpoints de gestión de API Keys.

## Archivos de Test

### `apikey.test.js`
Tests principales que cubren todas las funcionalidades de API Keys:

- **Creación de API Keys** (`POST /apikeys`)
- **Listado de API Keys** (`GET /apikeys`)
- **Revocación de API Keys** (`DELETE /apikeys/:id`)
- **Validaciones de permisos**
- **Manejo de errores**

### `run-apikey-tests.js`
Script dedicado para ejecutar solo los tests de API Keys.

## Cobertura de Tests

### 1. Creación de API Keys
- ✅ Crear API key con permisos válidos
- ✅ Crear API key con fecha de expiración
- ✅ Validar campos requeridos (descripción, permisos)
- ✅ Rechazar creación sin autenticación
- ✅ Validar formato de permisos

### 2. Listado de API Keys
- ✅ Listar API keys del usuario autenticado
- ✅ Verificar estructura de respuesta
- ✅ Rechazar listado sin autenticación
- ✅ Verificar que solo se muestren las propias API keys

### 3. Revocación de API Keys
- ✅ Revocar API key existente
- ✅ Rechazar revocación de API key inexistente
- ✅ Rechazar revocación sin autenticación
- ✅ Rechazar revocación de API key de otro usuario

### 4. Validaciones
- ✅ Aceptar todos los permisos en true
- ✅ Aceptar todos los permisos en false
- ✅ Validar formato de fecha de expiración
- ✅ Manejar datos malformados

### 5. Seguridad
- ✅ Verificar autenticación JWT requerida
- ✅ Verificar que usuarios solo accedan a sus propias API keys
- ✅ Validar permisos de usuario

## Ejecución de Tests

### Ejecutar todos los tests de API Keys
```bash
bun run test:apikey
```

### Ejecutar tests específicos
```bash
# Solo tests de creación
bun test test/apikey/apikey.test.js --grep "Crear API Key"

# Solo tests de listado
bun test test/apikey/apikey.test.js --grep "Listar API Keys"

# Solo tests de revocación
bun test test/apikey/apikey.test.js --grep "Revocar API Key"
```

### Ejecutar con timeout personalizado
```bash
bun test test/apikey/apikey.test.js --timeout 60000
```

## Requisitos Previos

1. **Servidor ejecutándose**: El servidor debe estar activo en `http://localhost:3000`
2. **Base de datos**: Configurada y accesible
3. **Usuario de prueba**: Credenciales válidas en `test/setup.js`
4. **Dependencias**: Bun instalado y configurado

## Estructura de Test Data

Los tests crean automáticamente:
- API keys de prueba con diferentes configuraciones
- Datos únicos para evitar conflictos entre tests
- Limpieza automática después de cada test

## Debugging

### Logs de Test
Los tests incluyen logs detallados para debugging:
- Tokens de autenticación obtenidos
- Respuestas de la API
- Errores y excepciones

### Timeout Configurado
- **Timeout global**: 30 segundos por test
- **Configurable**: Se puede modificar en `test/setup.js`

### Manejo de Errores
- Tests robustos que manejan diferentes códigos de estado HTTP
- Validación de respuestas de error
- Manejo de excepciones del servidor

## Integración con CI/CD

Los tests están diseñados para:
- Ejecutarse en entornos automatizados
- Proporcionar salidas claras para CI/CD
- Manejar timeouts y reintentos automáticamente
- Limpiar datos de prueba después de la ejecución

## Notas Importantes

- **Autenticación**: Cada test obtiene un token fresco para evitar problemas de concurrencia
- **Datos únicos**: Cada test genera datos únicos para evitar conflictos
- **Limpieza**: Los datos de prueba se limpian automáticamente
- **Isolación**: Los tests son independientes entre sí
- **Robustez**: Manejan diferentes escenarios de error y respuesta del servidor
