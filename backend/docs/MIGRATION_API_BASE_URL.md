# Migración: Agregar campo api_base_url a third_bank_credentials

## Descripción
Esta migración agrega el campo `api_base_url` a la tabla `third_bank_credentials` para almacenar la URL base de la API del banco en lugar de construirla dinámicamente.

## Cambios realizados

### 1. Schema de base de datos
- Agregado campo `api_base_url VARCHAR(255) NOT NULL` a la tabla `third_bank_credentials`
- El campo almacena la URL completa de la API del banco (ej: `https://apimkt.baneco.com.bo/ApiGateway/`)

### 2. Servicios actualizados
- **BankCredentialsService**: Agregado campo `apiBaseUrl` a todas las interfaces y métodos
- **QrService**: Modificado para usar `config.apiBaseUrl` en lugar de construir la URL dinámicamente

### 3. Scripts actualizados
- **setup-bankeco-credentials.ts**: Incluye el campo `apiBaseUrl` al crear credenciales
- **seed-db.ts**: Ejecuta la migración automáticamente
- **migrate-add-api-base-url.ts**: Script de migración para bases de datos existentes

## URLs por defecto configuradas

### Test (environment = 1)
```
https://apimktdesa.baneco.com.bo/ApiGateway/
```

### Producción (environment = 2)
```
https://apimkt.baneco.com.bo/ApiGateway/
```

## Cómo ejecutar la migración

### Opción 1: Automática (recomendado)
La migración se ejecuta automáticamente al ejecutar el seed:
```bash
npm run seed
# o
bun run seed
```

### Opción 2: Manual
```bash
# Compilar TypeScript
npm run build
# o
bun run build

# Ejecutar migración
node dist/scripts/migrate-add-api-base-url.js
```

### Opción 3: Desde TypeScript
```bash
bun run src/scripts/migrate-add-api-base-url.ts
```

## Verificación
Para verificar que la migración fue exitosa:

```sql
-- Verificar que el campo existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'third_bank_credentials' 
AND column_name = 'api_base_url';

-- Verificar que los registros tienen el campo poblado
SELECT id, environment, api_base_url 
FROM third_bank_credentials;
```

## Rollback (si es necesario)
```sql
-- Eliminar el campo (¡CUIDADO! Solo si es necesario)
ALTER TABLE third_bank_credentials DROP COLUMN api_base_url;
```

## Beneficios de este cambio

1. **Flexibilidad**: Cada credencial puede tener su propia URL de API
2. **Mantenibilidad**: No hay URLs hardcodeadas en el código
3. **Configuración centralizada**: Todas las URLs están en la base de datos
4. **Escalabilidad**: Fácil agregar nuevos bancos con diferentes URLs
5. **Consistencia**: Todas las operaciones usan la misma URL de la configuración

## Notas importantes

- La migración es **idempotente**: se puede ejecutar múltiples veces sin problemas
- Los registros existentes se actualizan automáticamente con URLs por defecto
- El campo es **NOT NULL**, por lo que todas las credenciales deben tener una URL válida
- Después de la migración, todas las operaciones de QR usarán la URL de la configuración del usuario
