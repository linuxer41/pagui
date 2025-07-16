# API Market

**Especificaciones Tecnicas v1.3.**

BANCO ECONÓMICO S.A. | Tecnologia de Informacion


## Contenido

- 1. Introducción
- 2. Formatos y convenciones
- 3. Encriptación de datos
- 4. URL de ambiente de certificación
- 5. API de Encriptación
   - 5.1. Encriptar datos
   - 5.2. Desencriptar datos
- 6. API de Autenticación
   - 6.1 Validación de credenciales de acceso
- 7. API de Pagos Simple a través de códigos QR
   - 7.1 Diagrama de Secuencia para pago con código QR
   - 7.2 Generación de QR
   - 7.3 Anular QR
   - 7.4 Verificar estado de QR
   - 7. 5 Notificación de pago de QR (Opcional)
   - 7.6 Lista de QR pagados
- 8. Consultas de cuentas
   - 8.1. Consulta de movimientos
- 9. Planillas de pagos
   - 9.1. Carga de planilla de pagos
- Anexo 1 – Definiciones de Objetos
   -  Objeto PaymentQR
   -  Objeto AccountHeader
   -  Objeto AccountDetail
   -  Objeto AccountWithheld
   -  Objeto AMLData
   -  Objeto BatchPayment


**Historial de cambios**

```
Versión Descripción
v0.2.
09/06/
```
```
 Descripción del algoritmo de encriptación
 Se adiciona el objeto payment como parte del request del servicio
StatusQR
v0.3.
15 /06/
```
```
 Actualización de url de Api para QR Simples
 Se adicionan JSON de ejemplos con respuestas exitosas
 Cambio de tipo de dato para la propiedad senderBankCode del objeto
PaymentQR
 Adición de fecha y hora del pago en el objeto PaymentQR
v0.4.
13/07/
```
```
 Corrección en nombre de método para autenticar.
```
```
v0.5.
23/07/
```
```
 Se adicionan en el documento las URI del ambiente de certificación
 Se adicionan JSON de ejemplos para el request y response del servicio
PaidQR
v0.6.
21/07/
```
```
 Diagrama de secuencia de flujo completo de un pago con QR Simple
```
```
v1.0.
07/11/
```
```
 Se adicionan documentación y ejemplos de API para encriptado y
desencriptado de datos
v1.1.
16/12/
```
```
 Descripción de nuevos métodos GET /v2/statusQR y /v2/paidQR
```
```
v1.2.
13/02/
```
```
 Actualización de request en api generateQr
```
```
v1.3.
28/04/
```
```
 Servicios de consultas de movimientos de cuentas
 Servicios para cargas de lotes o planillas de pagos
```

## 1. Introducción

```
El presente documento describe las especificaciones técnicas de las API que el Banco Económico S.A.
pone a disposición de sus clientes.
```
```
Estas API están diseñadas sobre tecnología REST y notación JSON como formato de intercambio de
información. Para poder hacer uso de cualquier API se debe enviar en la cabecera un Bearer Token
generado previamente con otra API para validación de credenciales de usuarios que serán
proporcionados por el Banco.
```
## 2. Formatos y convenciones

```
 Importe con decimales ; se usara el carácter punto (.) como separador de la parte entera con
la parte decimal y como máximo dos dígitos para la parte decimal.
 Fechas ; los tipos de datos fecha deberán usar el formato yyyy-MM-dd
 Horas ; la hora debe usar el formato HH:mm:ss (formato 24 horas)
 Nombres de propiedades ; los nombres de propiedades usaran la notación camelCase
```
## 3. Encriptación de datos

```
Se usara el algoritmo estándar AES como método para el cifrado de datos que se consideren
necesarios y se enviaran o se recibirán a través de las diferentes API. Para este algoritmo se usara
una llave de 256 bits (32 bytes), la cual será proporcionada por el banco para los ambientes de
certificación y producción
```
## 4. URL de ambiente de certificación

```
https://apimktdesa.baneco.com.bo/ApiGateway/
```
## 5. API de Encriptación

### 5.1. Encriptar datos

```
Descripción Encriptación de datos
Método Get
URI http://[dominio]:[puerto]/api/authentication/encrypt
```
```
Parámetros
Elemento Tipo de Dato Requerido Descripción
text Texto Si Texto a encriptar
aesKey Texto Si Llave de encriptación
```

```
Request ejemplo:
https://apimktdesa.bancavive.com.bo/ApiGateway/api/authentication/encrypt?text=1234&aesKey=40A318B
299F245C2B
```
```
Response ejemplo:
KJAzqjmwjxIOqVo5J3IH0/7fGmNdzuyszrlqexVSeos=
```
### 5.2. Desencriptar datos

```
Descripción Desencriptación de datos
Método Get
URI http://[dominio]:[puerto]/api/authentication/decrypt
```
```
Parámetros
Elemento Tipo de Dato Requerido Descripción
Text Texto Si Texto a desencriptar
aesKey Texto Si Llave de encriptación
```
```
Request ejemplo:
https://apimktdesa.bancavive.com.bo/ApiGateway/api/authentication/decrypt?text=KJAzqjmwjxIOqVo5J3IH
/7fGmNdzuyszrlqexVSeos=&aesKey=40A318B299F245C2B
```
```
Response ejemplo:
1234
```
## 6. API de Autenticación

### 6.1 Validación de credenciales de acceso

```
Descripción Validación de credenciales y solicitud de token (usado para el
consumo de otros servicios)
Método Post
URI http://[dominio]:[puerto]/api/authentication/authenticate
```
```
Request body
Elemento Tipo de Dato Requerido Descripción
userName Texto Si Nombre de usuario asignado por el
Banco
password Texto Si Contraseña ( cifrado )
```
```
Response
Elemento Tipo de Dato Descripción
```

```
responseCode Entero Código de respuesta, diferente de cero indica un
error
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
token Texto Token de autorización a enviar en la llamada de
otros servicios
```
```
Request ejemplo:
{
"userName":"26551010",
"password":"gmcqdMrrZsg1k7BZPgHC+95EINE073qdT8llUklDEcM="
}
```
```
Response ejemplo:
{
"token":
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiIyNjU1MTAxMCIsIm5iZiI6MTYyMzQ0NzU1OC
wiZXhwIjoxNjIzNDQ5MzU4LCJpYXQiOjE2MjM0NDc1NTgsImlzcyI6ImFwaS5iYW5lY28uY29tLmJvIi
wiYXVkIjoiQmFuZWNvQ3VzdG9tZXJzIn0.wvSQgpy4aheJew7QNjVfdgO7wv8uRFVZzXToCykcdC0",
"responseCode": 0,
"message": ""
}
```
## 7. API de Pagos Simple a través de códigos QR

### 7.1 Diagrama de Secuencia para pago con código QR


### 7.2 Generación de QR

```
Descripción Solicitud de generación de código QR para cobros a través de la
plataforma Pago Simple
Método Post
URI http://[dominio]:[puerto]/api/qrsimple/generateQR
```
```
Request body
Elemento Tipo de Dato Requerido Descripción
transactionId Texto Si Identificador de la transacción en el
sistema del comercio que solicita el QR
accountCredit Texto Si Número de la cuenta corriente o caja
de ahorro a la que se acreditara el pago
( cifrado )
currency Texto Si Moneda en la que se expresa el
importe del QR.
Valores:
BOB: bolivianos
USD: dólares americanos
amount Decimal Si Importe con el que se genera el QR (se
usa punto como separador decimal y
máximo hasta 2 decimales)
description Texto No Nota del cobro
dueDate Fecha Si Fecha de vencimiento del QR
singleUse Logico Si Especifica si el QR permite 1 o más
pagos.
Valores:
true: solo permite un solo pago
false: permite varios pagos
modifyAmount Logico Si Especifica si permite pagar o no el QR
con importe modificado.
Valores:
true: permite modificar el importe
false: no permite modificar el importe
(en este caso se rechaza el pago si tiene
un importe diferente al pagar)
branchCode Texto No Código de sucursal que solicita el QR.
Se usa cuando se requiere que se
realice un abono por cada sucursal por
el importe total de los QR cobrados
(máximo 5 caracteres)
```
```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
```

```
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
qrId Texto Identificador único del QR
qrImage Texto Imagen del código QR en formato texto base
```
```
Request ejemplo:
{
"transactionId": "123456789",
"accountCredit": "y6G5mb6P1UVMsGR+2mdEaZ0970Gyg6eSt3SxOaizwIY=",
"currency": "BOB",
"amount": 1.2,
"description": "Ejemplo generacion de QR",
"dueDate": "2021- 12 - 31 ",
"singleUse": true,
"modifyAmount": false,
"branchCode": "E0001"
}
```
```
Response ejemplo:
{
"qrId": "21061401016000000003",
"qrImage": "iVBORw0KGgoAAAANSUhEUgAAB5QAAAeUCAYAAACZoCvZA......",
"responseCode": 0,
"message": ""
}
```
### 7.3 Anular QR

```
Descripción Anula un QR para futuros pagos. Solo permite anular un QR de uso
único (singleUse = true) si no está pagado o un QR que no es de uso
único (singleUse = false)
Método Delete
URI http://[dominio]:[puerto]/api/qrsimple/cancelQR
```
```
Request body
Elemento Tipo de Dato Requerido Descripción
qrId Texto Si Identificador único del QR
```
```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
```

```
Request ejemplo:
{
"qrId": "21061401016000000003"
}
```
```
Response ejemplo:
{
"responseCode": 0,
"message": ""
}
```
### 7.4 Verificar estado de QR

```
Descripción Consulta el estado de un código QR
Método Get
URI http://[dominio]:[puerto]/api/qrsimple/v2/statusQR/{id}
```
```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
statusQRCode Entero Código del estado del QR.
Valores:
0: activo pendiente de pago
1: pagado (cuando singleUse = false se retorna este
valor si tiene al menos 1 pago)
9 : anulado
payment PaymentQR Objeto con la información de la transacción de pago
(cuando statusQRCode = 1)
```
```
Request ejemplo:
```
```
https://apimktdesa.baneco.com.bo/ApiGateway/api/qrsimple/v2/statusQR/
```
```
Response ejemplo:
{
"statusQrCode": 1,
"payment": [
{
"qrId": "21061401016000000006",
"transactionId": "1236342",
"paymentDate": "2021- 06 - 14T00:00:00",
```

```
"paymentTime": "17:06:29",
"currency": "BOB",
"amount": 1,
"senderBankCode": "1016",
"senderName": "PEDRO PEREZ",
"senderDocumentId": "0",
"senderAccount": "******1913",
"description": "Ejemplo generacion de QR",
"branchCode": "E0001"
}
],
"responseCode": 0,
"message": ""
}
```
### 7. 5 Notificación de pago de QR (Opcional)

```
Descripción Servicio publicado por el comercio para recibir una notificación al
momento del pago de un QR
Método Post
URI http://[dominio]:[puerto]/api/qrsimple/notifyPaymentQR
```
```
Request body
Elemento Tipo de Dato Requerido Descripción
Payment PaymentQR Si Objeto con información de la
transacción
```
```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
```
```
Request ejemplo:
{
"payment":
{
"qrId": "22113001016800000017",
"transactionId": "3161056",
"paymentDate": "2022- 11 - 30 T00:00:00",
"paymentTime": "15:00:27",
"currency": "USD",
"amount": 1.2,
```

```
"senderBankCode": "1016",
"senderName": "NOMBRECLIENTE 409182",
"senderDocumentId": "0",
"senderAccount": "******5691",
"description": "Ejemplo generacion de QR"
}
}
```
```
Response ejemplo:
{
"responseCode": 0,
"message": ""
}
```
### 7.6 Lista de QR pagados

```
Descripción Retorna el listado de QR pagados en una fecha, para uso en procesos
de conciliación o actualización de estados en procesos batch
Método Get
URI http://[dominio]:[puerto]/api/qrsimple/v2/paidQR/{fecha}
```
```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
Message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
paymentList Lista de
PaymentQR
```
```
Lista de objetos PaymentQR, donde cada elemento
de la lista corresponde a un pago recibido
```
```
Request ejemplo:
```
```
https://apimktdesa.baneco.com.bo/ApiGateway/api/qrsimple/v2/paidQR/ 20210719
```
```
La fecha debe tener el formato yyyyMMdd
```
```
Response ejemplo:
{
"paymentList": [
{
"qrId": "21070201016000000006",
"transactionId": "1236392",
"paymentDate": "2021- 07 - 19T00:00:00",
```

```
"paymentTime": "13:34:28",
"currency": "BOB",
"amount": 2.5,
"senderBankCode": "1016",
"senderName": "APE1-101434 APE2- 10 1434 NOMB-101434",
"senderDocumentId": "0",
"senderAccount": "******1913",
"description": "Ejemplo generacion de QR",
"branchCode": "E0001"
},
{
"qrId": "21071401016000000001",
"transactionId": "1236394",
"paymentDate": "2021- 07 - 19T00:00:00",
"paymentTime": "15:05:46",
"currency": "BOB",
"amount": 1.2,
"senderBankCode": "1016",
"senderName": "APE1-101434 APE2-101434 NOMB-101434",
"senderDocumentId": "0",
"senderAccount": "******1913",
"description": "Ejemplo generacion de QR",
"branchCode": "E0002"
}
],
"responseCode": 0,
"message": ""
}
```
## 8. Consultas de cuentas

### 8.1. Consulta de movimientos

```
Descripción Consulta de movimientos por periodo de cuentas corrientes o cajas de
ahorros
Método Post
URI http://[dominio]:[puerto]/api/accounts/history
```
```
Request body
Elemento Tipo de Dato Requerido Descripción
accountCode Texto Si Número de cuenta corriente o caja de
ahorros ( cifrado )
startDate Fecha Si Fecha de inicio de movimientos
```

```
(formato yyyy-MM-dd)
endDate Fecha Si Fecha final de movimientos (formato
yyyy-MM-dd)
```
```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
accountHeader AccountHeader Informacion de la cuenta
accountDetailList Lista de
AccountDetail
```
```
Lista de movimientos de la cuenta
```
```
accountWithheldList Lista de
AccountWithheld
```
```
Lista de retenciones de la cuenta
```
```
Request ejemplo:
{
"accountCode": "y6G5mb6P1UVMsGR+2mdEaZ0970Gyg6eSt3SxOaizwIY=",
"startDate": "202 5 - 01 - 15 ",
"endDate": "202 5 - 01 - 20 "
}
```
```
Response ejemplo:
{
"responseCode": 0,
"message": "",
"accountHeader": {},
"accountDetailList": [],
"accountWithheldList": []
}
```
## 9. Planillas de pagos

### 9.1. Carga de planilla de pagos

```
Descripción Carga de planillas de pagos a proveedores o pagos de sueldos
Método Post
URI http://[dominio]:[puerto]/api/batchPayment/upload
```

Request body

**Elemento Tipo de Dato Requerido Descripción**
batchId Texto Si Identificar único de la planilla de pago
type Texto Si Tipo de planillas (PAYROLL: sueldos;
PROVIDERS: proveedores)
descripction Texto Si Descripción o motivo del pago de
planilla
detailedDebit Logico Si **True:** se realiza un debito por cada ítem
de la planillas
**False:** se realiza un debito por el total
de la planillas

***** Para pagos a cuentas de otras
entidades financieras siempre se realiza
un debito por cada item
accountCode Texto Si Número de cuenta de la que se
debitaran los fondos para el pago de la
planilla
batchCurrency Texto Si Moneda de los importes de la planilla
(BOB: Bolivianos; USD: Dólares
Americanos)

***** La moneda siempre debe ser la
misma moneda de la cuenta de debito
batchAmount Decimal Si Importe total de la planilla (hasta 2
decimales)
AMLData AMLData Si Información sobre origen y destino de
fondos por el pago de planilla
paymentCount Entero Si Cantidad de pagos contenidos en el
detalle de la planilla
paymentList BatchPayment Si Detalle de pagos de la planilla


```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
bankBatchId Entero Numero de planilla asignado por el Banco
```
9.2. Confirmación de estado de detalles de planilla

```
Descripción Servicio publicado por la empresa para recibir una confirmación del
estado de cada pago del detalle de la planilla
Método Post
URI http://[dominio]:[puerto]/api/notifyStatus
```
```
Request body
Elemento Tipo de Dato Requerido Descripción
bankBatchId Entero Si Numero de planilla asignado por el
Banco
batchId Texto Si Identificador único de la planilla de
pago, asignado por la empresa
batchDetailId Texto Si Identificador único del pago asignado
por la Empresa
status Texto Si Estado del pago (ACEP: Pago aceptado,
RECH: Pago Rechazado)
descriptionStatus Texto No Descripción o motivo del rechazo del
pago
transactionIdDebit Entero Si Numero de transaccion de debito
registrado en el Banco
transactionIdCredit Texto Si Numero de transaccion de crédito
registrada en el Banco. En el caso de
pago a cuentas de otros bancos se
retorna el numero de trasnferencia
electronica
```
```
Response
Elemento Tipo de Dato Descripción
responseCode Entero Código de respuesta, diferente de cero indica un
error
message Texto Cuando responseCode es diferente de cero, indica el
mensaje del error
```
#### 9.3.


## Anexo 1 – Definiciones de Objetos

###  Objeto PaymentQR

```
Nombre Tipo de Dato Descripción
qrId Texto Identificador único del QR
transactionId Texto Numero de transacción del banco
paymentDate Fecha Fecha del pago
paymentTime Texto Hora del pago
currency Texto Moneda del pago.
Valores:
BOB: bolivianos
USD: dólares americanos
amount Decimal Importe del pago recibido
senderBankCode Texto Código ASFI del banco que origina el pago
senderName Texto Nombre o Razón Social de quien envía el pago
senderDocumentId Texto No se usa (siempre retorna valor cero)
senderAccount Texto Número de cuenta desde la que se realiza el pago
(dato ofuscado)
description Texto Glosa con la que se genera el QR
branchCode Texto Codigo de sucursal que solicito el QR (dato enviado
en generateQR)
```
###  Objeto AccountHeader

```
Nombre Tipo de Dato Descripción
accountCode Texto Número de cuenta corriente o caja de ahorro
( cifrado )
accountTypeCode Texto Código del tipo de cuenta (CC: Cuenta corriente; CA:
Caja de ahorros)
productName Texto Nombre comercial del producto
status Texto Estado de la cuenta (ACTIVA, INMOVILIZADA,
CLAUSURADA, CERRADA)
currency Texto Moneda de la cuenta (BOB: bolivianos; USD: dólares
americanos)
balance Decimal Saldo contable de la cuenta
balanceReserved Decimal Saldo reservado (pignorado)
balanceRetained Decimal Saldo retenido
balanceAvailable Decimal Saldo disponible (saldo contable menos saldo
reservado menos saldo retenido)
```

###  Objeto AccountDetail

```
Nombre Tipo de Dato Descripción
transactionId Entero Numero de transacción (identificador único)
date Fecha Fecha de la transacción (formato yyyy-MM-dd)
time Hora Hora dela transacción (formato HH:mm:ss)
documentNumber Entero Numero de documento o cheque de la transacción
transactionType Texto Tipo de transacción (D: Debito; C: Crédito)
amount Decimal Importe de la transacción expresado en moneda de
la cuenta (lleva signo negativo para débitos y signo
positivo para créditos)
description Texto Descripción de la transacción
clienteNote Texto Nota o glosa de la transacción
```
###  Objeto AccountWithheld

```
Nombre Tipo de Dato Descripción
transactionId Entero Numero de transacción de retención
date Fecha Fecha de la transacción (formato yyyy-MM-dd)
time Hora Hora dela transacción (formato HH:mm:ss)
amount Decimal Importe retenido
description Texto Descripción o motivo de la retención
instruction Texto Numero de circular que ordena la retención
demanding Texto Nombre del demandante
judge Texto Nombre del juez
piet Texto Proveído de inicio de ejecución tributaria
```
###  Objeto AMLData

```
Elemento Tipo de Dato Descripción
AMLSource Texto Origen de los fondos usados en la transacción
AMLDestination Texto Destino de los fondos usados en la transacción
```
###  Objeto BatchPayment

```
Nombre Tipo de Dato Descripción
batchDetailId Texto Identificador unico del pago
amount Decimal Importe del pago expresado en la moneda de la
planilla
```

accountCode Texto Número de cuenta beneficiaria del pago
accountTypeCode Texto Código del tipo de cuenta beneficiaria (CCAD:
Cuenta Corriente o Caja de ahorro; CMOVILD:
Billetera Movil)
bankCode Texto Código de la entidad financiera de la cuenta
beneficiaria (ver catálogo de códigos)
beneficiaryName Texto Nombre de la persona beneficiaria del pago
beneficaryDocId Texto Numero de documento de identidad del beneficiario
(opcional)
beneficiaryPhone Texto Número de teléfono celular del beneficiario para
envío de notificación del pago (opcional)
beneficiaryEmail Texto Dirección de correo electrónico del beneficiario para
envío de notificación del pago (opcional)
note Texto Nota o glosa del pago
AMLData AMLData


