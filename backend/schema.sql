-- ========================================
-- SCHEMA DEL SISTEMA DE PAGOS CON QR
-- ========================================

-- Eliminar todas las tablas existentes (en orden de dependencias)
DROP TABLE IF EXISTS payment_sync_status CASCADE;
DROP TABLE IF EXISTS account_movements CASCADE;
DROP TABLE IF EXISTS user_accounts CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS third_bank_credentials CASCADE;

-- ========================================
-- 1. TABLAS DE CONFIGURACIÓN Y ROLES
-- ========================================

-- Crear tabla de roles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla de usuarios
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- 2. TABLAS DE CREDENCIALES BANCARIAS
-- ========================================

-- Crear tabla para credenciales bancarias
CREATE TABLE third_bank_credentials (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  merchant_id VARCHAR(50) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  encryption_key VARCHAR(255) NOT NULL,
  environment VARCHAR(10) NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'prod')),
  api_base_url VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- 3. TABLAS DE CUENTAS BANCARIAS
-- ========================================

-- Crear tabla de cuentas bancarias
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(50) UNIQUE NOT NULL,
  account_type VARCHAR(20) NOT NULL DEFAULT 'current' CHECK (account_type IN ('current', 'savings', 'business')),
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  third_bank_credential_id INTEGER NOT NULL REFERENCES third_bank_credentials(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla de relación usuarios-cuentas
CREATE TABLE user_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'co-owner', 'viewer')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, account_id)
);

-- ========================================
-- 4. TABLAS DE MOVIMIENTOS Y TRANSACCIONES
-- ========================================

-- Crear tabla de movimientos de cuenta
CREATE TABLE account_movements (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
    'deposit', 'withdrawal', 'transfer_in', 'transfer_out', 
    'qr_payment', 'fee', 'interest', 'refund', 'adjustment'
  )),
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  description TEXT,
  
  -- Campos específicos para QR payments
  qr_id VARCHAR(50),
  sender_name VARCHAR(255),
  
  -- Campos genéricos para referencias
  reference_id VARCHAR(100),
  reference_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- 5. TABLAS DE CÓDIGOS QR
-- ========================================

-- Crear tabla de códigos QR
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  third_bank_credential_id INTEGER REFERENCES third_bank_credentials(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB' CHECK (currency IN ('BOB', 'USD')),
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  qr_image TEXT, -- Imagen del QR en base64
  single_use BOOLEAN NOT NULL DEFAULT true,
  modify_amount BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- 6. TABLAS DE SINCRONIZACIÓN DE PAGOS
-- ========================================

-- Crear tabla para rastrear estado de sincronización de pagos
CREATE TABLE payment_sync_status (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) NOT NULL UNIQUE,
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_check TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '2 minutes',
  check_count INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  final_status VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. TABLAS DE AUTENTICACIÓN Y API
-- ========================================

-- Crear tabla de tokens de autenticación
CREATE TABLE auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  token_type VARCHAR(20) NOT NULL DEFAULT 'access',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Crear tabla de API keys
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- 8. ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices de usuarios
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

-- Índices de cuentas
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_user_accounts_user ON user_accounts(user_id);
CREATE INDEX idx_user_accounts_account ON user_accounts(account_id);

-- Índices de movimientos
CREATE INDEX idx_account_movements_account ON account_movements(account_id);
CREATE INDEX idx_account_movements_type ON account_movements(movement_type);
CREATE INDEX idx_account_movements_qr ON account_movements(qr_id);
CREATE INDEX idx_account_movements_reference ON account_movements(reference_id, reference_type);
CREATE INDEX idx_account_movements_status ON account_movements(status);

-- Índices de QR codes
CREATE INDEX idx_qr_codes_account ON qr_codes(account_id);
CREATE INDEX idx_qr_codes_third_bank_credential ON qr_codes(third_bank_credential_id);

-- Índices de sincronización
CREATE INDEX idx_payment_sync_qr_id ON payment_sync_status(qr_id);
CREATE INDEX idx_payment_sync_next_check ON payment_sync_status(next_check);
CREATE INDEX idx_payment_sync_last_checked ON payment_sync_status(last_checked);

-- ========================================
-- 9. FUNCIONES DE NEGOCIO
-- ========================================

-- Función para calcular balance de cuenta
CREATE OR REPLACE FUNCTION calculate_account_balance(account_id_param INTEGER)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  total_balance DECIMAL(15, 2) := 0.00;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN movement_type IN ('deposit', 'transfer_in', 'qr_payment') THEN amount
      WHEN movement_type IN ('withdrawal', 'transfer_out') THEN -amount
      ELSE 0
    END
  ), 0.00) INTO total_balance
  FROM account_movements 
  WHERE account_id = account_id_param;
  
  RETURN total_balance;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar balance automáticamente
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accounts 
  SET 
    balance = calculate_account_balance(NEW.account_id),
    available_balance = calculate_account_balance(NEW.account_id),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at automáticamente en payment_sync_status
CREATE OR REPLACE FUNCTION update_payment_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- 10. TRIGGERS
-- ========================================

-- Trigger para actualizar balance de cuenta automáticamente
CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON account_movements
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Trigger para actualizar updated_at en payment_sync_status
CREATE TRIGGER trigger_update_payment_sync_updated_at
  BEFORE UPDATE ON payment_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_sync_updated_at();