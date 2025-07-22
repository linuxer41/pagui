DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS qr_codes;
DROP TABLE IF EXISTS company_bank;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS banks;

-- Crear tabla para empresas
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  business_id VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('company', 'individual')),
  document_id VARCHAR(50) NOT NULL,
  address TEXT,
  contact_email VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para bancos
CREATE TABLE banks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  api_version VARCHAR(10),
  test_api_url TEXT,
  prod_api_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla de roles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla de usuarios (simplificada)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para tokens de autenticación
CREATE TABLE auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('ACCESS_TOKEN','PASSWORD_RESET', 'REFRESH_TOKEN', 'EMAIL_VERIFICATION')),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_times INTEGER DEFAULT 0 CHECK (used_times >= 0),
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para API keys
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para configuración empresa-banco
CREATE TABLE company_bank (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_id INTEGER NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  account_number VARCHAR(50) NOT NULL,
  account_type INTEGER NOT NULL DEFAULT 1 CHECK (account_type BETWEEN 1 AND 5),
  account_name VARCHAR(100),
  merchant_id VARCHAR(50),
  additional_config JSONB DEFAULT '{}',
  environment INTEGER NOT NULL DEFAULT 1 CHECK (environment IN (1, 2)), -- 1=test, 2=prod
  bank_branch VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, bank_id)
);

-- Crear tabla para códigos QR
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  account_credit TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_bank_id INTEGER NOT NULL REFERENCES company_bank(id) ON DELETE CASCADE,
  environment INTEGER NOT NULL DEFAULT 1 CHECK (environment IN (1, 2)), -- 1=test, 2=prod
  currency VARCHAR(3) NOT NULL CHECK (char_length(currency) = 3),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  single_use BOOLEAN NOT NULL DEFAULT TRUE,
  modify_amount BOOLEAN NOT NULL DEFAULT FALSE,
  qr_image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para transacciones
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) REFERENCES qr_codes(qr_id) ON DELETE SET NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_bank_id INTEGER NOT NULL REFERENCES company_bank(id) ON DELETE CASCADE,
  environment INTEGER NOT NULL DEFAULT 1 CHECK (environment IN (1, 2)), -- 1=test, 2=prod
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  payment_date TIMESTAMPTZ NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (char_length(currency) = 3),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  type VARCHAR(20) NOT NULL CHECK (type IN ('incoming', 'outgoing')),
  sender_name VARCHAR(255),
  sender_document_id VARCHAR(50),
  sender_account VARCHAR(50),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para registro de actividad
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  action_details JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL CHECK (status IN ('INFO', 'ERROR', 'WARNING')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear índices optimizados
CREATE INDEX idx_qr_codes_company_status ON qr_codes(company_id, status);
CREATE INDEX idx_qr_codes_due_date_status ON qr_codes(due_date, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_transactions_company_date ON transactions(company_id, payment_date DESC);
CREATE INDEX idx_transactions_type_status ON transactions(type, status);
CREATE INDEX idx_activity_logs_company_created ON activity_logs(company_id, created_at DESC);
CREATE INDEX idx_api_keys_company_status ON api_keys(company_id, status);
CREATE INDEX idx_users_company_role ON users(company_id, role_id);

-- Insertar roles predefinidos (versión mejorada)
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('SUPER_ADMIN', 'Acceso total al sistema', '{"*": true}', true),
('COMPANY_ADMIN', 'Administrador de empresa', '{"companies": {"read": true, "update": true}, "users": {"create": true, "read": true, "update": true}, "qr_codes": {"create": true, "read": true, "update": true}, "transactions": {"read": true}, "reports": {"read": true}}', true),
('FINANCIAL_MANAGER', 'Gestor financiero', '{"transactions": {"read": true}, "qr_codes": {"read": true}, "reports": {"read": true}, "company_bank": {"read": true}}', true),
('OPERATOR', 'Operador básico', '{"qr_codes": {"create": true, "read": true}, "transactions": {"read": true}}', true);