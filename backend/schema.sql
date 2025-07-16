-- Schema para sistema de pagos con QR multiempresa
-- Compatible con PostgreSQL

-- Eliminar tablas si existen (para recrear la base de datos)
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS qr_payments;
DROP TABLE IF EXISTS qr_codes;
DROP TABLE IF EXISTS company_bank_configs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS banks;

-- Crear tabla para empresas
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  business_id VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  contact_email VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para configuración de bancos
CREATE TABLE banks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  api_version VARCHAR(10),
  encryption_key TEXT,
  test_api_url TEXT,
  prod_api_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla de usuarios con relación a empresa
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  company_id INTEGER REFERENCES companies(id),
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para API keys
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  permissions JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para configuración de empresa-banco
CREATE TABLE company_bank_configs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  bank_id INTEGER NOT NULL REFERENCES banks(id),
  account_number VARCHAR(50),
  account_type INTEGER NOT NULL DEFAULT 1,
  account_name VARCHAR(50),
  account_username VARCHAR(50),
  account_password VARCHAR(50),
  merchant_id VARCHAR(50),
  encryption_key TEXT,
  additional_config JSONB DEFAULT '{}',
  environment INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, bank_id)
);

-- Crear tabla para los QR generados
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  account_credit TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  bank_id INTEGER NOT NULL REFERENCES banks(id),
  currency VARCHAR(3) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  single_use BOOLEAN NOT NULL,
  modify_amount BOOLEAN NOT NULL,
  branch_code VARCHAR(10),
  qr_image TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla para pagos de QR
CREATE TABLE qr_payments (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  bank_id INTEGER NOT NULL REFERENCES banks(id),
  transaction_id VARCHAR(100) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  payment_time VARCHAR(10) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  sender_bank_code VARCHAR(20) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  sender_document_id VARCHAR(50) NOT NULL,
  sender_account VARCHAR(50) NOT NULL,
  description TEXT,
  branch_code VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (qr_id) REFERENCES qr_codes(qr_id)
);

-- Crear tabla para registro de actividad y monitoreo
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  user_id INTEGER REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  action_details JSONB,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_qr_codes_company_id ON qr_codes(company_id);
CREATE INDEX idx_qr_codes_bank_id ON qr_codes(bank_id);
CREATE INDEX idx_qr_codes_status ON qr_codes(status);
CREATE INDEX idx_qr_codes_due_date ON qr_codes(due_date);
CREATE INDEX idx_qr_payments_qr_id ON qr_payments(qr_id);
CREATE INDEX idx_qr_payments_company_id ON qr_payments(company_id);
CREATE INDEX idx_qr_payments_payment_date ON qr_payments(payment_date);
CREATE INDEX idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_status ON activity_logs(status);
CREATE INDEX idx_api_keys_company_id ON api_keys(company_id);

-- Nota: Los datos iniciales ahora se insertan a través del script seed-db.ts 