# 🏦 Script de Creación de Credenciales Bancarias

## 📋 Descripción

Este script permite crear credenciales bancarias para Banco Económico de forma interactiva, solicitando los datos necesarios por consola de manera segura.

## 🚀 Uso

### **Comando Básico**
```bash
cd src/scripts
npx tsx create-bank-credentials.ts
```

### **Ver Ayuda**
```bash
npx tsx create-bank-credentials.ts --help
```

## 📝 Datos Solicitados

El script solicita los siguientes datos:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **📋 Número de cuenta** | Número de cuenta bancaria | `5021531650` |
| **🏷️ Nombre de cuenta** | Nombre descriptivo de la cuenta | `Cuenta Producción Banco Económico` |
| **👤 Usuario** | Usuario proporcionado por el banco | `A96661050` |
| **🔒 Contraseña** | Contraseña (se oculta al escribir) | `Anarkia41?` |
| **🔑 Clave AES** | Clave de encriptación AES del banco | `320A7492A2334CDDADD8230D251B917C` |
| **🌍 Entorno** | Entorno del banco (test/prod) | `prod` |

## ⚙️ Valores por Defecto

Los siguientes valores se configuran automáticamente:

```typescript
merchantId: 'BANECO_PROD_MERCHANT'
environment: 'prod'  // Por defecto, pero puedes elegir 'test' o 'prod'
apiBaseUrl: 'https://apimkt.baneco.com.bo/ApiGateway/'  // Para prod
// o 'https://apimktdesa.baneco.com.bo/ApiGateway/'  // Para test
```

## 💡 Ejemplo de Uso

```bash
$ npx tsx create-bank-credentials.ts

🏦 === CREAR CREDENCIALES BANCARIAS BANECO ===

📋 Número de cuenta: 5021531650
🏷️  Nombre de la cuenta: Mi Cuenta Producción
👤 Usuario: A96661050
🔒 Contraseña: Anarkia41?
🔑 Clave de encriptación AES: 320A7492A2334CDDADD8230D251B917C
🌍 Entorno (test/prod) [prod]: prod

📊 === RESUMEN DE DATOS ===
📋 Número de cuenta: 5021531650
🏷️  Nombre de cuenta: Mi Cuenta Producción
👤 Usuario: A96661050
🔒 Contraseña: ********
🔑 Clave AES: 320A7492A2334CDDADD8230D251B917C
🏪 Merchant ID: BANECO_PROD_MERCHANT
🌍 Entorno: prod
🔗 URL API: https://apimkt.baneco.com.bo/ApiGateway/

❓ ¿Confirmar creación? (s/N): s

🔄 Creando credenciales bancarias...
✅ ¡Credenciales bancarias creadas exitosamente!

📋 === DETALLES DE LA CREDENCIAL ===
🆔 ID: 1
📋 Número de cuenta: 5021531650
🏷️  Nombre: Mi Cuenta Producción
👤 Usuario: A96661050
🏪 Merchant ID: BANECO_PROD_MERCHANT
🌍 Entorno: prod
🔗 URL API: https://apimkt.baneco.com.bo/ApiGateway/
📊 Estado: active
📅 Creado: 2025-01-06T20:30:00.000Z

🎉 Script completado exitosamente
```

## 🔒 Características de Seguridad

- **Contraseña visible**: La contraseña se muestra mientras se escribe (más compatible)
- **Validación de datos**: Se valida que todos los campos requeridos estén presentes
- **Confirmación**: Se solicita confirmación antes de crear las credenciales
- **Resumen**: Se muestra un resumen completo de los datos antes de confirmar
- **Compatibilidad**: Funciona correctamente en Windows, Linux y macOS

## 🛠️ Funcionalidades

### **Entrada de Contraseña**
- **Contraseña visible**: Se muestra mientras se escribe (más compatible)
- Soporte para backspace para corregir errores
- Ctrl+C para cancelar en cualquier momento
- Funciona en todos los terminales sin problemas

### **Validación de Datos**
- Verifica que todos los campos requeridos estén presentes
- Muestra mensajes de error claros si faltan datos

### **Confirmación Interactiva**
- Muestra un resumen completo de los datos
- Solicita confirmación antes de proceder
- Permite cancelar la operación

### **Resultado Detallado**
- Muestra todos los detalles de la credencial creada
- Incluye ID, fechas y estado de la credencial

## 📁 Estructura del Archivo

```
src/scripts/
├── create-bank-credentials.ts    # Script principal
└── README-bank-credentials.md    # Este archivo de documentación
```

## 🔧 Dependencias

El script utiliza las siguientes dependencias:

- `readline`: Para entrada interactiva desde consola
- `bankCredentialsService`: Servicio para crear credenciales bancarias

## ⚠️ Notas Importantes

1. **Seguridad**: La contraseña se oculta por seguridad, pero se almacena en la base de datos
2. **Entorno**: Por defecto se crea para producción (`prod`)
3. **URL**: Se usa la URL de producción de Banco Económico
4. **Validación**: Todos los campos son obligatorios
5. **Cancelación**: Se puede cancelar en cualquier momento con Ctrl+C

## 🚨 Solución de Problemas

### **Error: "El campo es requerido"**
- Asegúrate de ingresar todos los campos solicitados
- No dejes campos vacíos

### **Error de conexión a base de datos**
- Verifica que la base de datos esté ejecutándose
- Revisa la configuración de conexión en `database.ts`

### **Error de permisos**
- Asegúrate de tener permisos para escribir en la base de datos
- Verifica que el usuario de la base de datos tenga los permisos necesarios

## 📞 Soporte

Si tienes problemas con el script, verifica:

1. Que todas las dependencias estén instaladas
2. Que la base de datos esté ejecutándose
3. Que la configuración de conexión sea correcta
4. Que tengas los permisos necesarios
