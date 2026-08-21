-- ========================================
-- PAGUI WALLET — Database Schema (Clean)
-- Dominios: Identity, Banking, Payments, Collections, API
-- IDs: BIGINT (Snowflake), generados en aplicación
-- ========================================

-- tablas muertas (legacy)
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS dead_letter_queue CASCADE;
DROP TABLE IF EXISTS qr_payments CASCADE;
DROP TABLE IF EXISTS recaudacion_config CASCADE;
DROP TABLE IF EXISTS registration_requests CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_clients CASCADE;
DROP TABLE IF EXISTS user_tenants CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS direct_transactions CASCADE;
DROP TABLE IF EXISTS collection_config CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;
DROP TABLE IF EXISTS nfc_pending CASCADE;
DROP TABLE IF EXISTS outgoing_webhook_jobs CASCADE;
DROP TABLE IF EXISTS outgoing_webhooks CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS fee_rules CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS tenant_users CASCADE;
DROP TABLE IF EXISTS wallet_permissions CASCADE;
DROP TABLE IF EXISTS wallet_movements CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS baneco_credentials CASCADE;
DROP TABLE IF EXISTS banks CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS otp_codes CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS payment_sync_status CASCADE;

-- ========================================
-- DOMINIO: Identity (Identidad)
-- ========================================

CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  role SMALLINT NOT NULL DEFAULT 3,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE tenants (
  id BIGINT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  document_type VARCHAR(20),
  document_number VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(3),
  address TEXT,
  photo_url VARCHAR(500),
  biometric_hash VARCHAR(255),
  biometric_data_url VARCHAR(500),
  kyc_selfie_url VARCHAR(500),
  kyc_document_front_url VARCHAR(500),
  kyc_document_back_url VARCHAR(500),
  kyc_ocr_text TEXT,
  kyc_ocr_confidence NUMERIC(6, 3),
  kyc_face_match BOOLEAN,
  kyc_face_similarity NUMERIC(8, 4),
  kyc_ml_run_at TIMESTAMPTZ,
  kyc_level VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (kyc_level IN ('none', 'basic', 'verified', 'premium')),
  kyc_submitted_at TIMESTAMPTZ,
  kyc_verified_at TIMESTAMPTZ,
  kyc_verified_by BIGINT,
  kyc_rejection_reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  environment VARCHAR(10) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  pin_hash VARCHAR(255),
  daily_limit DECIMAL(15,2) DEFAULT 5000.00,
  monthly_limit DECIMAL(15,2) DEFAULT 50000.00,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_users (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);

CREATE TABLE auth_tokens (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  token_type VARCHAR(20) NOT NULL DEFAULT 'access',
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE otp_codes (
  id BIGINT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);

CREATE TABLE registration_requests (
  id BIGINT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  company VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100),
  platform VARCHAR(20),
  device_id VARCHAR(255) UNIQUE,
  fcm_token TEXT,
  apns_token TEXT,
  biometric_key_hash VARCHAR(256),
  encrypted_biometric_key TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- DOMINIO: Banking (Banca)
-- ========================================

CREATE TABLE banks (
  id BIGINT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE baneco_credentials (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
  account_holder VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  merchant_id VARCHAR(50) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  encryption_key VARCHAR(255),
  environment VARCHAR(10) NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'prod')),
  api_base_url VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE bank_accounts (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_code VARCHAR(20) NOT NULL REFERENCES banks(code),
  account_holder VARCHAR(150) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  holder_document VARCHAR(50) NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE wallets (
  id BIGINT PRIMARY KEY,
  wallet_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'Mi Wallet',
  type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'business')),
  level VARCHAR(10) NOT NULL DEFAULT 'bronze',
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  available_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  held_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  is_default BOOLEAN DEFAULT false,
  is_collection BOOLEAN NOT NULL DEFAULT false,
  max_per_tx DECIMAL(15,2),
  max_daily DECIMAL(15,2),
  max_monthly DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE wallet_permissions (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, wallet_id)
);

-- ========================================
-- DOMINIO: Payments (Pagos y Billetera)
-- ========================================

CREATE TABLE transfers (
  id BIGINT PRIMARY KEY,
  sender_wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  receiver_wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  amount DECIMAL(15,2) NOT NULL,
  fee DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);

CREATE TABLE qr_codes (
  id BIGINT PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  baneco_credential_id BIGINT REFERENCES baneco_credentials(id) ON DELETE SET NULL,
  baneco_environment VARCHAR(16),
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB' CHECK (currency IN ('BOB', 'USD')),
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  qr_image TEXT,
  single_use BOOLEAN NOT NULL DEFAULT true,
  modify_amount BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE wallet_movements (
  id BIGINT PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
    'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
    'qr_payment', 'settlement', 'fee', 'interest', 'refund', 'adjustment'
  )),
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT,
  qr_id VARCHAR(50),
  transaction_id VARCHAR(100) UNIQUE,
  payment_date TIMESTAMPTZ,
  currency VARCHAR(3) DEFAULT 'BOB',
  sender_name VARCHAR(255),
  sender_document_id VARCHAR(50),
  sender_account VARCHAR(50),
  sender_bank_code VARCHAR(20),
  settlement_id BIGINT,
  reference_id VARCHAR(100),
  reference_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE payment_sync_status (
  qr_id VARCHAR(50) PRIMARY KEY,
  last_checked TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  check_count INT DEFAULT 1,
  success BOOLEAN NOT NULL DEFAULT false,
  final_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collection_config (
  id BIGINT PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  use_default BOOLEAN NOT NULL DEFAULT true,
  baneco_credential_id BIGINT REFERENCES baneco_credentials(id),
  bank_account_id BIGINT REFERENCES bank_accounts(id),
  collection_type VARCHAR(10) NOT NULL DEFAULT 'gateway' CHECK (collection_type IN ('gateway', 'direct')),
  commission_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  UNIQUE(wallet_id)
);

CREATE TABLE direct_transactions (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  config_id BIGINT REFERENCES collection_config(id),
  qr_code_id BIGINT REFERENCES qr_codes(id),
  gross_amount DECIMAL(15,2) NOT NULL,
  commission DECIMAL(15,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
  commission_paid BOOLEAN NOT NULL DEFAULT false,
  commission_paid_at TIMESTAMPTZ,
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  reference VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settlements (
  id BIGINT PRIMARY KEY,
  wallet_movement_id BIGINT REFERENCES wallet_movements(id) ON DELETE SET NULL,
  from_wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  config_id BIGINT REFERENCES collection_config(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  qr_code_id BIGINT REFERENCES qr_codes(id) ON DELETE SET NULL,
  gross_amount DECIMAL(15,2) NOT NULL,
  commission DECIMAL(15,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference VARCHAR(100),
  error_message TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- DOMINIO: Collections (Recaudaciones)
-- ========================================

-- ========================================
-- DOMINIO: API Keys
-- ========================================

CREATE TABLE api_keys (
  id BIGINT PRIMARY KEY,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{"qr_generate": false, "qr_status": false, "qr_cancel": false}',
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- Dominio: NFC
-- ========================================

CREATE TABLE nfc_pending (
  id BIGINT PRIMARY KEY,
  nfc_id VARCHAR(64) NOT NULL UNIQUE,
  sender_wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  receiver_wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  receiver_user_id BIGINT NOT NULL REFERENCES users(id),
  amount DECIMAL(18, 2) NOT NULL,
  signature VARCHAR(256) NOT NULL,
  nonce VARCHAR(32) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Infrastructure
-- ========================================

CREATE TABLE idempotency_keys (
  id BIGINT PRIMARY KEY,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE outgoing_webhooks (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE,
  url VARCHAR(512) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outgoing_webhook_jobs (
  id BIGINT PRIMARY KEY,
  webhook_id BIGINT NOT NULL REFERENCES outgoing_webhooks(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  scheduled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Índices
-- ========================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_tenants_document ON tenants(document_type, document_number);
CREATE INDEX idx_tenants_kyc ON tenants(kyc_level);

CREATE INDEX idx_wallets_number ON wallets(wallet_number);
CREATE INDEX idx_wallets_status ON wallets(status);
CREATE INDEX idx_wallets_level ON wallets(level);
CREATE INDEX idx_wallets_tenant ON wallets(tenant_id);
CREATE INDEX idx_wallets_default ON wallets(is_default);

CREATE INDEX idx_wallet_permissions_user ON wallet_permissions(user_id);
CREATE INDEX idx_wallet_permissions_wallet ON wallet_permissions(wallet_id);

CREATE INDEX idx_wallet_movements_wallet ON wallet_movements(wallet_id);
CREATE INDEX idx_wallet_movements_type ON wallet_movements(movement_type);
CREATE INDEX idx_wallet_movements_qr ON wallet_movements(qr_id);
CREATE INDEX idx_wallet_movements_settlement ON wallet_movements(settlement_id);
CREATE INDEX idx_wallet_movements_reference ON wallet_movements(reference_id, reference_type);
CREATE INDEX idx_wallet_movements_status ON wallet_movements(status);

CREATE INDEX idx_qr_codes_wallet ON qr_codes(wallet_id);
CREATE INDEX idx_qr_codes_user ON qr_codes(user_id);

CREATE INDEX idx_settlements_user ON settlements(user_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_qr ON settlements(qr_code_id);

CREATE INDEX idx_api_keys_wallet ON api_keys(wallet_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

CREATE INDEX idx_transfers_sender ON transfers(sender_wallet_id);
CREATE INDEX idx_transfers_receiver ON transfers(receiver_wallet_id);
CREATE INDEX idx_transfers_status ON transfers(status);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);

CREATE INDEX idx_idempotency_key ON idempotency_keys(idempotency_key);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- ========================================
-- Funciones y Triggers
-- ========================================

CREATE OR REPLACE FUNCTION calculate_wallet_balance(wallet_id_param BIGINT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  total_balance DECIMAL(15,2) := 0.00;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type IN ('deposit', 'transfer_in', 'qr_payment') THEN amount
      WHEN movement_type IN ('withdrawal', 'transfer_out', 'settlement') THEN -amount
      ELSE 0
    END
  ), 0.00) INTO total_balance
  FROM wallet_movements
  WHERE wallet_id = wallet_id_param AND deleted_at IS NULL;
  RETURN total_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallets
  SET
    balance = calculate_wallet_balance(COALESCE(NEW.wallet_id, OLD.wallet_id)),
    available_balance = calculate_wallet_balance(COALESCE(NEW.wallet_id, OLD.wallet_id)),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.wallet_id, OLD.wallet_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_balance
AFTER INSERT OR UPDATE OR DELETE ON wallet_movements
FOR EACH ROW
EXECUTE FUNCTION trigger_update_wallet_balance();

-- ========================================
-- Migrations tracking
-- ========================================
CREATE TABLE IF NOT EXISTS _migrations (
  name VARCHAR(255) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL DEFAULT '',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT NOT NULL DEFAULT 0
);
