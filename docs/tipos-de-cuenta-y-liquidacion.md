# Tipos de Cuenta y Flujo de Liquidación

## Modelo de Dos Niveles

```
PAGUI (Cuenta Empresarial)
  ├── Cuentas administradas (administered)
  │   └── El cliente usa las credenciales por defecto de IATHINGS
  └── Cuentas de tránsito (passthrough)
      └── El cliente tiene sus propias credenciales bancarias (Baneco)
```

## Estructura

### accounts

| Columna | Valores | Descripción |
|---------|---------|-------------|
| `account_level` | `business` / `client` | **Business** = cuenta de PAGUI; **Client** = cuenta del cliente final |
| `account_subtype` | `administered` / `passthrough` | Ver significado según `account_level` abajo |
| `bank_credential_id` | `bigint \| null` | **Business**: siempre tiene credencial propia en DB. **Client `passthrough`**: obligatorio tener credencial propia. **Client `administered`**: `NULL` (usa IATHINGS de env vars) |

#### account_subtype según account_level

| account_level | administered | passthrough |
|---------------|-------------|-------------|
| **business** | PAGUI gestiona su propia credencial bancaria en DB (businessCredId) | No aplica |
| **client** | El cliente usa las credenciales por defecto de IATHINGS (env vars). `bank_credential_id = NULL` | El cliente tiene sus propias credenciales Baneco en DB. `bank_credential_id` apunta a su bank_credential |

### bank_credentials

| Columna | Descripción |
|---------|-------------|
| `type` | `business` (PAGUI) o `client` (del cliente final) |
| `commission_rate` | Comisión en % que se descuenta al liquidar (ej: `0.01` = 0.01 %) |
| `user_id` | Propietario de la credencial (null para business) |

### settlements

| Columna | Descripción |
|---------|-------------|
| `to_bank_credential_id` | **Nullable**. Solo se llena si `account_subtype = 'passthrough'`. Para `administered` queda `NULL` porque la credencial destino viene de variables de entorno. |
| `commission_rate` | Tasa de comisión aplicada al momento de crear el settlement (inmutable). |

## Flujo Completo

### 1. Generación de QR

Siempre se usa la **cuenta business de PAGUI**:

```
POST /qr/generate
  → accountRepository.getBusinessAccount()
  → businessAccount.bankCredentialId → credencial business de PAGUI
  → BanecoAdapter.generateQr(token, ref, account_number_business, monto)
```

El QR generado pertenece a la cuenta empresarial de PAGUI. El `userId` opcional asocia el QR a un cliente para saber a quién liquidar después.

### 2. Pago del QR (Webhook)

Cuando un QR es pagado, Baneco notifica via `POST /hooks/baneco/notifyPayment`:

```
handleBanecoNotification(data)
  → Busca QR por qrId
  → Crea account_movement (qr_payment) en la cuenta business de PAGUI
  → Si QR tiene userId:
      → Busca las cuentas del usuario
      → Encuentra la cuenta con accountLevel = 'client'
      → Determina commissionRate según accountSubtype:
          ├── administered → IATHINGS_CLIENT_COMMISSION_RATE (env var)
          └── passthrough   → bank_credential.commission_rate del cliente
      → Calcula: grossAmount → comisión → netAmount
      → Crea settlement con:
          ├── administered → toBankCredentialId = NULL
          └── passthrough   → toBankCredentialId = clientCred.id
```

### 3. Procesamiento de Liquidación

Cada 60 segundos, `settlementService.processPending()` ejecuta los settlements pendientes:

```
process(settlementId)
  → fromAccountId → businessAccount → businessCred (PAGUI)
  → BanecoAdapter(api_base_url, encryption_key) usando credencial business
  → getToken(username, password) — autenticación business
  → Determina cuenta destino según toBankCredentialId:
      ├── toBankCredentialId != NULL (passthrough)
      │   → bankCredentialRepository.getById(toBankCredentialId)
      │   → accountNumber = clientCred.accountNumber
      └── toBankCredentialId = NULL (administered)
          → IATHINGS_CLIENT_ACCOUNT_NUMBER (env var)
          → Si no está configurada → ERROR 500
  → generateQr(token, ref, accountNumber, netAmount)
  → Crea account_movement (settlement)
  → Marca settlement como completed
```

El QR de liquidación es un cobro que PAGUI genera autenticado como business, dirigido a la cuenta del cliente (por `accountNumber` destino). **No es el cliente quien genera un QR**, sino PAGUI quien genera una transferencia vía QR hacia la cuenta del cliente.

## Comisión

- Se calcula al **crear el settlement** (inmutable desde ese momento).
- Fórmula: `commission = grossAmount × (commissionRate / 100)`
- Origen de `commissionRate`:
  - **administered**: `IATHINGS_CLIENT_COMMISSION_RATE` del entorno (default `0.01` = 0.01 %)
  - **passthrough**: `bank_credentials.commission_rate` del cliente

## Variables de Entorno (IATHINGS)

Usadas solo para cuentas con `account_subtype = 'administered'`:

```
IATHINGS_CLIENT_USERNAME=...
IATHINGS_CLIENT_PASSWORD=...
IATHINGS_CLIENT_ENCRYPTION_KEY=...
IATHINGS_CLIENT_ACCOUNT_NUMBER=...
IATHINGS_CLIENT_API_BASE_URL=https://apimktdesa.baneco.com.bo/ApiGateway
IATHINGS_CLIENT_COMMISSION_RATE=0.01
IATHINGS_MERCHANT_ID=MERCH-IATHINGS
```

Estas **nunca se almacenan en la base de datos**.

## Casos de Error

| Situación | Comportamiento |
|-----------|----------------|
| QR pagado pero usuario no tiene cuenta `client` | Se salta la liquidación (log warning) |
| Passthrough sin `bank_credentials` configuradas | Se salta la liquidación (log warning) |
| Administered sin `IATHINGS_CLIENT_ACCOUNT_NUMBER` | Settlement falla con error 500 |
| Settlement falla (cualquier motivo) | Status `failed`, se guarda `error_message`, se reintenta en el próximo ciclo |

## Seed de Ejemplo

```
Usuario demo (usuario@example.com):
  → accountLevel: client, accountSubtype: passthrough
  → bank_credential propia (clientCredId, commissionRate: 0.01)
  → Al liquidar: usa su propia credencial + su commissionRate

Usuario IATHINGS (iathings@example.com):
  → accountLevel: client, accountSubtype: administered
  → bank_credential_id = NULL (sin credential en DB)
  → Al liquidar: usa IATHINGS_CLIENT_* de env vars
```

## Diagrama Conceptual

```
                ┌──────────────────────────────────────────┐
                │              BANECO                       │
                │  (API Gateway)                            │
                └────┬──────────────────────────┬───────────┘
                     │                          │
          ┌──────────▼──────────┐    ┌──────────▼──────────┐
          │  PAGUI Business     │    │  Cliente destino     │
          │  (autenticación)    │    │  (cuenta Baneco)     │
          │  ──────────────     │    │  ──────────────      │
          │  bank_credentials   │    │  Si administered:     │
          │  type=business      │    │    IATHINGS env var  │
          │                     │    │  Si passthrough:     │
          │                     │    │    bank_credentials  │
          │                     │    │    type=client       │
          └─────────────────────┘    └──────────────────────┘
                     ▲                          ▲
                     │                          │
          ┌──────────┴──────────────────────────┴──────────┐
          │             settlement.service.ts               │
          │  generateQr(token, ref, clientAccount, net)     │
          └─────────────────────────────────────────────────┘
```
