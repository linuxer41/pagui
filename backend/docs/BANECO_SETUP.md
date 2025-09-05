# Configuración de Banco Económico (Baneco)

Este documento describe cómo configurar las credenciales de Banco Económico para el sistema de pagos QR.

## Credenciales de Prueba

Las credenciales de prueba están configuradas para el entorno de desarrollo:

- **Usuario**: `1649710`
- **Contraseña**: `1234`
- **Llave AES del Banco**: `6F09E3167E1D40829207B01041A65B12` (para API del banco)
- **Cuenta para Abonos**: `1041070599`
- **URL**: `https://apimktdesa.baneco.com.bo/ApiGateway/`
- **Entorno**: Test (environment = 1)

## Credenciales de Producción

Las credenciales de producción están configuradas para el entorno de producción:

- **Usuario**: `demo_user_prod`
- **Contraseña**: `demo_pass_prod_123`
- **Llave AES del Banco**: `6F09E3167E1D40829207B01041A65B12` (para API del banco)
- **Cuenta para Abonos**: `1041070599`
- **URL**: `https://apimkt.baneco.com.bo/ApiGateway/`
- **Entorno**: Producción (environment = 2)

## Configuración Automática

### Opción 1: Usar el script completo de seed

```bash
bun run seed-db
```

Este comando ejecutará todo el proceso de inicialización de la base de datos, incluyendo las credenciales bancarias.

### Opción 2: Configurar solo las credenciales bancarias

```bash
bun run setup-baneco
```

Este comando solo configurará las credenciales de Banco Económico sin afectar otros datos.

## Verificación de Configuración

Para verificar que las credenciales estén correctamente configuradas:

1. **Verificar en la base de datos**:
   ```sql
   SELECT id, environment, account_number, username, status 
   FROM third_bank_credentials 
   WHERE deleted_at IS NULL;
   ```

2. **Verificar en el sistema**:
   - Las credenciales se desencriptan automáticamente cuando se usan
   - El sistema usa el entorno correcto según la configuración
   - Los QRs se generan usando las credenciales apropiadas

## Estructura de la Base de Datos

Las credenciales se almacenan en la tabla `third_bank_credentials` con los siguientes campos:

- `id`: Identificador único
- `environment`: 1 = Test, 2 = Producción
- `account_number`: Número de cuenta bancaria
- `username`: Usuario (encriptado)
- `password`: Contraseña (encriptada)
- `encryption_key`: Llave de encriptación (encriptada)
- `merchant_id`: ID del comercio
- `account_name`: Nombre de la cuenta
- `bank_branch`: Sucursal bancaria
- `status`: Estado (active/inactive)

## Seguridad

### Sistema de Encriptación del Sistema
- **Encriptación de DB**: Todas las credenciales sensibles (username, password) se encriptan usando AES-256-CBC
- **Clave del Sistema**: Se usa la variable de entorno `ENCRYPTION_KEY` (ej: `Pagui41?!`)
- **Desencriptación Automática**: Las credenciales se desencriptan automáticamente cuando se necesitan
- **Variable de Entorno**: Asegúrate de tener `ENCRYPTION_KEY=Pagui41?!` en tu archivo `.env`

### Sistema de Encriptación del Banco
- **Llave AES del Banco**: `6F09E3167E1D40829207B01041A65B12` (NO se encripta en la DB)
- **Propósito**: Esta clave se usa para encriptar datos que se envían a la API del banco
- **Almacenamiento**: Se guarda como texto plano en la DB ya que no es información sensible

## Troubleshooting

### Error: "No existe configuración activa de Banco Económico"

1. Verificar que las credenciales existan en la base de datos
2. Verificar que el status sea 'active'
3. Verificar que no estén marcadas como eliminadas (deleted_at IS NULL)

### Error: "Error en proceso de desencriptación"

1. Verificar que la variable `CRYPTO_KEY` esté configurada
2. Verificar que la clave de encriptación sea la correcta
3. Verificar que las credenciales no estén corruptas

### Error: "Credenciales de Banco Económico no configuradas"

1. Verificar que username y password no estén vacíos
2. Verificar que las credenciales se hayan desencriptado correctamente
3. Verificar que el entorno (environment) sea el correcto

## URLs de API

- **Test**: `https://apimktdesa.baneco.com.bo/ApiGateway/`
- **Producción**: `https://apimkt.baneco.com.bo/ApiGateway/`

## Notas Importantes

- Las credenciales de prueba solo funcionan en el entorno de desarrollo
- Las credenciales de producción solo funcionan en el entorno de producción
- Nunca compartas las credenciales de producción en entornos de desarrollo
- Cambia las contraseñas regularmente en producción
- Monitorea el uso de las credenciales para detectar actividad sospechosa
