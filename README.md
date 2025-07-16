# Sistema de Pagos QR Multiempresa

Sistema para generación y gestión de códigos QR de pago basado en las especificaciones del Banco Económico con soporte multiempresa y multibanco.

## Características

- **Multiempresa**: Cada empresa tiene su propia cuenta y configuración
- **Multibanco**: Soporte para diferentes bancos (Banco Económico, BNB y BISA)
- **API Keys**: Generación de API keys para integración con sistemas externos
- **Monitoreo**: Seguimiento de transacciones y actividad
- **Seguridad**: Autenticación JWT y API key con permisos granulares

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

- **Backend**: API REST desarrollada con Bun y Elysia.js
- **Frontend**: Aplicación web desarrollada con Svelte

## Requisitos

- [Bun](https://bun.sh/) v1.0.0 o superior
- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v14 o superior

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd payments
```

### 2. Configurar la base de datos

1. Crear una base de datos en PostgreSQL:

```bash
createdb payments
```

2. Crear los archivos de variables de entorno:

```bash
cd backend
bun run create-env
```

Esto creará automáticamente los archivos `.env` tanto para el backend como para el frontend con la configuración predeterminada, incluyendo los datos de conexión a los bancos.

3. (Opcional) Editar el archivo `.env` del backend si necesitas personalizar la configuración.

### 3. Instalar dependencias e inicializar el backend

```bash
cd backend
bun install
bun run init-db   # Inicializa el esquema de la base de datos
bun run seed-db   # Carga los datos iniciales con la configuración de los bancos
bun run dev       # Inicia el servidor en modo desarrollo
```

Si encuentras algún error relacionado con la base de datos, verifica que:
- PostgreSQL esté en ejecución
- Las credenciales en el archivo `.env` sean correctas
- La base de datos `payments` exista

### 4. Instalar dependencias y ejecutar el frontend

```bash
cd frontend
bun install
bun run dev
```

## Uso

### Acceso al sistema

1. Abre tu navegador en `http://localhost:5173`
2. Inicia sesión con las credenciales del Banco Económico:
   - Usuario: `1649710`
   - Contraseña: `1234`

### Generación de QR

1. Navega a la sección "Generación de QR"
2. Selecciona el banco con el que deseas generar el QR (Banco Económico, BNB o BISA)
3. Completa el formulario con los datos requeridos:
   - Número de Cuenta: Se cargará automáticamente según el banco seleccionado
   - Moneda: Selecciona BOB o USD según necesites
   - Monto: Ingresa el monto deseado
   - Fecha de vencimiento: Selecciona la fecha de expiración del QR
4. Haz clic en "Generar QR"
5. El código QR generado se mostrará en pantalla y podrás descargarlo

### Administración de API Keys

1. Navega a la sección "API Keys"
2. Puedes crear nuevas API keys con permisos específicos
3. Las API keys pueden ser revocadas en cualquier momento

## API REST

La documentación de la API está disponible en:

```
http://localhost:3000/swagger
```

## Datos de configuración de los bancos

El sistema viene preconfigurado con los siguientes bancos:

### Banco Económico
- **Código**: 1016
- **Usuario**: 1649710
- **Contraseña**: 1234
- **Llave de encriptación**: 6F09E3167E1D40829207B01041A65B12
- **Cuenta para abonos**: 1041070599
- **URL API**: https://apimktdesa.baneco.com.bo/ApiGateway/

### Banco Nacional de Bolivia (BNB)
- **Código**: 1001
- **Llave de encriptación**: 6F09E3167E1D40829207B01041A65B12 (misma del Banco Económico)
- **Cuenta para abonos**: 10010000001
- **URL API**: https://api-sandbox.bnb.com.bo/

### Banco BISA
- **Código**: 1003
- **Llave de encriptación**: 6F09E3167E1D40829207B01041A65B12 (misma del Banco Económico)
- **Cuenta para abonos**: 10030000001
- **URL API**: https://api-test.grupobisa.com/

Estos datos se configuran automáticamente al ejecutar el script `seed-db`.

## Variables de entorno

### Backend (.env)

| Variable | Descripción | Valor predeterminado |
|----------|-------------|----------------------|
| DB_USER | Usuario de PostgreSQL | postgres |
| DB_PASSWORD | Contraseña de PostgreSQL | postgres |
| DB_HOST | Host de PostgreSQL | localhost |
| DB_PORT | Puerto de PostgreSQL | 5432 |
| DB_NAME | Nombre de la base de datos | payments |
| JWT_SECRET | Clave secreta para firmar tokens JWT | cambiar_por_secreto_seguro |
| JWT_EXPIRATION | Tiempo de expiración de tokens JWT | 24h |
| PORT | Puerto del servidor | 3000 |
| HOST | Host del servidor | 0.0.0.0 |
| ENCRYPTION_KEY | Clave para encriptación AES | 6F09E3167E1D40829207B01041A65B12 |
| BANECO_API_URL | URL de la API del Banco Económico | https://apimktdesa.baneco.com.bo/ApiGateway/ |
| BANECO_USERNAME | Usuario para la API del Banco Económico | 1649710 |
| BANECO_PASSWORD | Contraseña para la API del Banco Económico | 1234 |
| BANECO_ACCOUNT | Cuenta para abonos del Banco Económico | 1041070599 |
| CORS_ORIGIN | Origen permitido para CORS | http://localhost:5173 |

### Frontend (.env)

| Variable | Descripción | Valor predeterminado |
|----------|-------------|----------------------|
| VITE_API_URL | URL base de la API | http://localhost:3000/api |

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 