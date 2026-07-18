# PAGUI Wallet

Sistema de pagos, cobranzas y billeteras digitales multi-tenant.

## Arquitectura Lógica (Modelo Tenant-Centric)

```
┌─────────────────────────────────────────────────────────────┐
│                        TENANT (Cliente)                      │
│  KYC · documentos · niveles · configs · límites             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Wallets                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ Wallet A │  │ Wallet B │  │ Wallet C │  ...      │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ tenant_users (rol: owner/manager/viewer)
           ┌────────────┼────────────┐
           ▼            ▼            ▼
       ┌──────┐    ┌──────┐    ┌──────┐
       │ User │    │ User │    │ User │  ← Solo autenticación
       │(owner│    │(mgr) │    │(view)│    (login, JWT, rol
       └──────┘    └──────┘    └──────┘     del sistema)
                        │
                        ▼
              wallet_permissions
              (acceso granular a wallets
               específicas dentro del tenant)
```

### Principios

1. **User** — existe **solo para autenticarse** (login, JWT, rol del sistema Super/User/Manager). No tiene KYC, no tiene datos de cliente.
2. **Tenant** — es la **entidad central**. Cada tenant es un cliente del sistema con su propia configuración:
   - KYC completo (nivel, documentos, fotos, biometría)
   - Datos personales/comerciales
   - Estado y niveles de verificación
3. **tenant_users** — relaciona un user a un tenant con un rol (`owner`/`manager`/`viewer`). Un user pertenece a **exactamente un tenant** (PK = `user_id`).
4. **Wallet** — pertenece al tenant (`wallets.tenant_id`). Un tenant puede tener múltiples wallets.
5. **wallet_permissions** — otorga acceso de un user a una wallet específica dentro del tenant. Un user puede acceder a varios wallets con distintos roles.
6. **KYC, límites, configs** — todo vive en `tenants` y `wallets.tenant_id`, nunca en `users`.

### Flujo de Registro

1. Admin registra un **Tenant** (cliente) con sus datos
2. Se crea el **User** asociado (login del cliente)
3. Se vincula vía **tenant_users** como `owner`
4. Se crea la **Wallet** principal del tenant
5. Se otorga permiso al user vía **wallet_permissions**
6. Admin puede agregar users adicionales (`manager`/`viewer`) con acceso selectivo a wallets

## Estructura del Proyecto

```
/
├── backend/          API REST (Bun + Elysia.js)
│   ├── schema.sql    Definición completa de la BD
│   ├── migrations/   Migraciones versionadas
│   └── src/
│       ├── identity/       Dominio Identity (auth, users, tenants, KYC)
│       ├── banking/        Dominio Banking (wallets, cuentas)
│       ├── payments/       Dominio Payments (transferencias, QR, fees)
│       ├── collections/    Dominio Collections (cobranzas, empresas)
│       └── scripts/        seed-db.ts (datos iniciales)
├── frontend/         App SvelteKit (panel de administración)
└── page/             App Svelte SSR (página pública)
```

## Requisitos

- [Bun](https://bun.sh/) v1.0+
- [PostgreSQL](https://www.postgresql.org/) v14+

## Instalación

```bash
cd backend
bun install
bun run init-db   # Crea esquema completo
bun run seed-db   # Carga datos demo
bun run dev       # Dev server :3000

cd frontend
bun install
bun run dev       # Dev server :5173
```

## Comandos Backend

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Servidor desarrollo :3000 |
| `bun run build` | Build → dist/ |
| `bun test` | Tests (unit + API) |
| `bun run init-db` | Reset + schema |
| `bun run seed-db` | Init + seed demo |

## Endpoints Clave

| Ruta | Descripción |
|------|-------------|
| `POST /auth/login` | Login (email + password) |
| `POST /transfers/p2p` | Transferencia P2P |
| `POST /wallets` | Crear wallet |
| `POST /kyc/submit` | Enviar documentación KYC |
| `GET /tenants` | Listar tenants del user |
| `POST /webhooks` | Registrar webhook |

## Seed Demo

El seed crea 4 tenants con 8 wallets, 12 transferencias P2P, 8 pagos QR, 41 movimientos y balances realistas distribuidos en 60 días. Incluye usuarios dependientes (contador, asistente, tesorero, auditor) con acceso granular a wallets.

## Variables de Entorno

Ver `backend/.env` después de ejecutar `bun run create-env`.
