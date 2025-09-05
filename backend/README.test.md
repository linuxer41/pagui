# Pruebas Unitarias - Backend de Pagos QR

Este directorio contiene las pruebas unitarias para el backend de pagos con QR. Las pruebas están implementadas utilizando el test runner nativo de Bun (`bun:test`).

## Estructura de las pruebas

- `test/setup.js`: Configuración global para las pruebas
- `test/auth.test.js`: Pruebas de autenticación
- `test/qr/generation.test.js`: Pruebas de generación de códigos QR
- `test/payment/notification.test.js`: Pruebas de notificación de pagos
- `test/index.test.js`: Punto de entrada principal que ejecuta todas las pruebas

## Requisitos previos

Antes de ejecutar las pruebas, asegúrate de que:

1. El servidor esté iniciado en el puerto 3000
2. La base de datos esté correctamente configurada y sembrada con datos iniciales
3. Las dependencias estén instaladas

```bash
# Instalar dependencias
bun install

# Inicializar la base de datos con datos de prueba
bun run seed-db
```

## Ejecución de pruebas

Puedes ejecutar todas las pruebas con:

```bash
bun test
```

O ejecutar pruebas específicas:

```bash
# Solo pruebas de autenticación
bun run test:auth

# Solo pruebas de generación de QR
bun run test:qr

# Solo pruebas de notificación de pagos
bun run test:payment
```

## Flujo de pruebas

Las pruebas siguen un flujo lógico:

1. Autenticación: Login y obtención de token JWT
2. Generación de QR: Crear un código QR y verificar su estado inicial
3. Notificación de pago: Enviar una notificación de pago y verificar que el estado del QR cambia

## Depuración de pruebas

Para ver información detallada durante las pruebas, puedes usar el modo verbose:

```bash
bun test --verbose
```

## Configuración adicional

Puedes modificar los parámetros de las pruebas en el archivo `test/setup.js`, donde se definen:

- URL base de la API
- Credenciales de prueba
- Tiempos de espera globales
- Prefijos de API
