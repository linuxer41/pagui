# AGENTS.md — PAGUI WALLET

## Arquitectura

Monorepo con backend Elysia.js (Bun), frontend SvelteKit, page Node SSR, WhatsApp bot.

---

## Backend — Stack Completo

### Infraestructura
| Componente | Estado | Detalle |
|-----------|--------|---------|
| PostgreSQL 17 | ✅ | 18+ tablas, Snowflake BIGINT PKs |
| Redis 7 | ✅ | Sesiones, cache, colas (fallback in-memory) |
| Nginx | ✅ | Reverse proxy, rate limiting, SSL |
| Docker Compose | ✅ | backend + pg + redis + workers + nginx |
| CI/CD | ✅ | GitHub Actions (test → build → push → deploy) |
| Sentry | ✅ | Error tracking + APM |
| OpenTelemetry | ✅ | Tracing distribuido (OTLP) |
| Logs JSON | ✅ | Correlation ID, estructura, flush |
| Health checks | ✅ | /health, /readiness, /liveness, /stats, /metrics |

### Dominios

| Dominio | Módulos | Rutas API |
|---------|---------|-----------|
| **Identity** | Auth (JWT+OTP+biométrico), Users, Roles, KYC | `/auth/*`, `/users/*`, `/kyc/*` |
| **Banking** | Accounts, Credentials, BankAdapter Baneco | `/banking/*` |
| **Payments** | Wallets, Transfers, QR, Fees, Notifications, SSE, Fraud, FX, Subscriptions, Split, Merchant, Cash, NFC | `/transfers/*`, `/wallets/*`, `/qr/*`, `/subscriptions/*`, `/split/*`, `/merchants/*`, `/cash/*`, `/nfc/*` |
| **Collections** | Companies, EMPSAAT | `/collections/*` |
| **API Keys** | API key management | `/api-keys/*` |
| **Webhooks** | Outgoing webhooks + retry queue | `/webhooks/*` |
| **Reconciliation** | Bank reconciliation | `/reconciliation/*` |
| **Compliance** | PCI-DSS, Data Retention, Audit | `/compliance/*` |
| **Monitoring** | Health, Stats, Metrics, Migrations | `/health/*` |

### Endpoints Clave

```
POST /auth/login          → login (email+password)
POST /auth/biometric/login → login biométrico
POST /auth/biometric/register → registrar huella/face
POST /transfers/p2p       → transferencia P2P (idempotente + fraude)
POST /subscriptions       → crear suscripción (daily/weekly/monthly/yearly)
POST /split/pay           → pago compartido múltiple
POST /merchants/register  → registrar comercio
POST /merchants/pay       → pagar en comercio
POST /cash/transaction    → cash-in / cash-out
POST /nfc/prepare         → preparar pago NFC offline
POST /kyc/submit          → enviar documentación KYC
POST /webhooks            → registrar webhook saliente
POST /compliance/retention/run → limpiar datos viejos
```

### Features de Seguridad & Calidad

| Feature | Implementación |
|---------|---------------|
| Rate limiting | Sliding window en memoria (120 req/min default) |
| Idempotency | Header `Idempotency-Key` → tabla + middleware |
| Fraude | Rule-based + ML scoring (velocidad, monto, hora, dispositivo) |
| Idempotencia P2P | Evita duplicados en transferencias |
| Audit log | Inmutable, todas las acciones del usuario |
| PCI-DSS | Headers de seguridad, no-log de datos sensibles, cifrado AES-256 |
| Data Retention | Políticas por tabla (30-730 días), dry-run disponible |
| Cifrado | AES-256 para seed phrases, llaves biométricas |
| Push notifications | FCM (Android) + APNS (iOS) |
| WebSockets | Canal bidireccional con autenticación JWT |

### Comandos

```bash
bun run dev                  # Dev server :3000
bun run build                # Build → dist/
bun test                     # Tests (17 unit + API)
bun run init-db              # Reset + schema
bun run seed-db              # Init + seed data
```

### Infraestructura (Docker)

```bash
docker-compose up -d                    # Full stack
docker-compose --profile dev up -d       # + pgadmin + redis-commander
docker-compose --profile tracing up -d   # + OpenTelemetry
```

### CI/CD Pipeline

GitHub Actions: `test` → `lint` → `build-and-push` → `deploy`

### Load Testing

```bash
k6 run tests/load/api.scenario.ts   # 20→50→100 users, 30s stages
```

---

## Database

- 25 tablas: roles, users, user_profiles, auth_tokens, devices, banks, bank_credentials, accounts, user_accounts, wallets, transfers, qr_codes, account_movements, payment_sync_status, fee_rules, notifications, companies, api_keys, idempotency_keys, fx_rates, fraud_alerts, reconciliation_logs, outgoing_webhooks, wallet_backups, subscriptions, merchants, cash_agents, nfc_pending, audit_logs, dead_letter_queue
- Migrations versionadas en `backend/migrations/`
- IDs Snowflake BIGINT generados en app (`shared/snowflake.ts`)

---

## Quotations (Cotizaciones)

Sistema de cotizaciones HTML con CSS reutilizable para propuestas comerciales.

### Estructura

```
quotations/
├── css/
│   └── cotizacion.css        ← CSS con variables y clases reutilizables
├── cotizacion.html           ← Cotización específica (ej: Providencia)
└── cotizacion-modelo.html    ← Plantilla genérica para nuevas cotizaciones
```

### Cómo crear una nueva cotización

1. Copiar `cotizacion-modelo.html` a `cotizacion-[cliente].html`
2. Personalizar variables en un `<style>`, ej:
   ```css
   :root { --primary: #1a365d; }
   ```
3. Rellenar secciones (header, fases, tablas, condiciones)
4. El CSS (`css/cotizacion.css`) ya incluye:
   - Variables CSS: `--primary`, `--text`, `--font`, `--page-max-width`, etc.
   - Componentes: `.page`, `.header`, `.logo-box`, `.info-row`, `.highlight`, `.benefits`, `.benefit-card`, `.comparison`, `.terms`, `.footer`, `.signature-row`
   - Utilidades: `.text-right`, `.font-bold`, `.savings`, `.mt-10`, `.mb-10`, etc.
5. Abrir en navegador y exportar a PDF (Ctrl+P)

### Productos iathings para cotizaciones

| Producto | Descripción |
|----------|-------------|
| **Vendemas** | Sistema de gestión comercial (ventas, catálogos, clientes) |
| **Pagui** | Plataforma de conexión bancaria (0.1% por transacción, respaldado por Banco Económico) |
| **Factugest** | API de facturación electrónica autorizada por Impuestos Nacionales (desde Bs 120 por NIT) |
