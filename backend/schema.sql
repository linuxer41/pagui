-- Restructuración completa del sistema bancario
-- Eliminar todas las tablas existentes
DROP TABLE IF EXISTS account_movements CASCADE;
DROP TABLE IF EXISTS user_accounts CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS third_bank_credentials CASCADE;

-- Crear tabla de roles simplificada
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de usuarios simplificada
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
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de cuentas bancarias (PIEZA CENTRAL)
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
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de relación usuarios-cuentas
CREATE TABLE user_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'co-owner', 'viewer')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, account_id)
);

-- Crear tabla de movimientos de cuenta
CREATE TABLE account_movements (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'qr_payment')),
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  description TEXT,
  reference_id VARCHAR(100),
  reference_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de códigos QR
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de transacciones
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) REFERENCES qr_codes(qr_id) ON DELETE SET NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('incoming', 'outgoing')),
  sender_name VARCHAR(255),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de tokens de autenticación
CREATE TABLE auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  token_type VARCHAR(20) NOT NULL DEFAULT 'access',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de API keys
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_user_accounts_user ON user_accounts(user_id);
CREATE INDEX idx_user_accounts_account ON user_accounts(account_id);
CREATE INDEX idx_account_movements_account ON account_movements(account_id);
CREATE INDEX idx_account_movements_type ON account_movements(movement_type);
CREATE INDEX idx_qr_codes_account ON qr_codes(account_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);

-- Crear función para calcular balance de cuenta
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

-- Crear función para actualizar balance automáticamente
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

-- Crear trigger para movimientos de cuenta
CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON account_movements
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Insertar roles básicos
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Administrador del sistema', '{"all": true}'),
('user', 'Usuario estándar', '{"basic": true}'),
('manager', 'Gerente', '{"management": true}');

-- Insertar credenciales bancarias de prueba
INSERT INTO third_bank_credentials (
  account_number, account_name, merchant_id, username, password, 
  encryption_key, environment, api_base_url, status
) VALUES (
  '1234567890', 'Cuenta Test Banco', 'TEST_MERCHANT', 'test_user', 'test_pass',
  'test_key', 'test', 'https://api-test.banco.com', 'active'
);