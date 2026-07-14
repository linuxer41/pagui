-- ========================================
-- PAGUI WALLET — Database Schema
-- Dominios: Identity, Banking, Payments, Collections, API
-- IDs: BIGINT (Snowflake), generados en aplicación
-- ========================================

DROP TABLE IF EXISTS nfc_pending CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS cash_agents CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS outgoing_webhook_jobs CASCADE;
DROP TABLE IF EXISTS outgoing_webhooks CASCADE;
DROP TABLE IF EXISTS fraud_alerts CASCADE;
DROP TABLE IF EXISTS reconciliation_logs CASCADE;
DROP TABLE IF EXISTS wallet_backups CASCADE;
DROP TABLE IF EXISTS fx_rates CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS fee_rules CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS payment_sync_status CASCADE;
DROP TABLE IF EXISTS account_movements CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS user_accounts CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS bank_credentials CASCADE;
DROP TABLE IF EXISTS banks CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ========================================
-- DOMINIO: Identity (Identidad)
-- ========================================

CREATE TABLE roles (
  id BIGINT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  role_id BIGINT NOT NULL REFERENCES roles(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  pin_hash VARCHAR(255),
  kyc_level VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (kyc_level IN ('none', 'basic', 'verified', 'premium')),
  document_type VARCHAR(20),
  document_number VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(3),
  is_phone_verified BOOLEAN DEFAULT false,
  is_email_verified BOOLEAN DEFAULT false,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_method VARCHAR(20) CHECK (two_factor_method IN ('sms', 'authenticator', 'email')),
  backup_codes TEXT[],
  daily_limit DECIMAL(15,2) DEFAULT 5000.00,
  monthly_limit DECIMAL(15,2) DEFAULT 50000.00,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_tokens (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  token_type VARCHAR(20) NOT NULL DEFAULT 'access',
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
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

CREATE TABLE bank_credentials (
  id BIGINT PRIMARY KEY,
  bank_id BIGINT NOT NULL REFERENCES banks(id),
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

CREATE TABLE accounts (
  id BIGINT PRIMARY KEY,
  account_number VARCHAR(50) UNIQUE NOT NULL,
  account_type VARCHAR(20) NOT NULL DEFAULT 'current' CHECK (account_type IN ('current', 'savings', 'business')),
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  available_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  bank_credential_id BIGINT NOT NULL REFERENCES bank_credentials(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_accounts (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'co-owner', 'viewer')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, account_id)
);

-- ========================================
-- DOMINIO: Payments (Pagos y Billetera)
-- ========================================

CREATE TABLE wallets (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  name VARCHAR(50) NOT NULL DEFAULT 'Principal',
  type VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'business', 'savings')),
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  available_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  held_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  is_default BOOLEAN DEFAULT false,
  max_per_tx DECIMAL(15,2),
  max_daily DECIMAL(15,2),
  max_monthly DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qr_codes (
  id BIGINT PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bank_credential_id BIGINT REFERENCES bank_credentials(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB' CHECK (currency IN ('BOB', 'USD')),
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  qr_image TEXT,
  single_use BOOLEAN NOT NULL DEFAULT true,
  modify_amount BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  wallet_id BIGINT REFERENCES wallets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE account_movements (
  id BIGINT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
    'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
    'qr_payment', 'fee', 'interest', 'refund', 'adjustment'
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
  reference_id VARCHAR(100),
  reference_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE payment_sync_status (
  qr_id VARCHAR(50) PRIMARY KEY,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_check TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '2 minutes',
  check_count INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  final_status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fee_rules (
  id BIGINT PRIMARY KEY,
  transaction_type VARCHAR(50) NOT NULL,
  fee_type VARCHAR(10) NOT NULL CHECK (fee_type IN ('percentage', 'fixed', 'hybrid')),
  fee_value DECIMAL(10,4) NOT NULL,
  fee_cap DECIMAL(15,2),
  min_amount DECIMAL(15,2),
  max_amount DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE companies (
  id BIGINT PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  colors JSONB DEFAULT '{}',
  api_key_encrypted TEXT,
  pagui_api_key_encrypted TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- DOMINIO: API Keys
-- ========================================

CREATE TABLE api_keys (
  id BIGINT PRIMARY KEY,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{"qr_generate": false, "qr_status": false, "qr_cancel": false}',
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- ========================================
-- Índices
-- ========================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_bank_cred ON accounts(bank_credential_id);
CREATE INDEX idx_user_accounts_user ON user_accounts(user_id);
CREATE INDEX idx_user_accounts_account ON user_accounts(account_id);

CREATE INDEX idx_account_movements_account ON account_movements(account_id);
CREATE INDEX idx_account_movements_type ON account_movements(movement_type);
CREATE INDEX idx_account_movements_qr ON account_movements(qr_id);
CREATE INDEX idx_account_movements_reference ON account_movements(reference_id, reference_type);
CREATE INDEX idx_account_movements_status ON account_movements(status);

CREATE INDEX idx_qr_codes_account ON qr_codes(account_id);
CREATE INDEX idx_qr_codes_bank_cred ON qr_codes(bank_credential_id);
CREATE INDEX idx_qr_codes_wallet ON qr_codes(wallet_id);

CREATE INDEX idx_payment_sync_next_check ON payment_sync_status(next_check);
CREATE INDEX idx_payment_sync_last_checked ON payment_sync_status(last_checked);

CREATE INDEX idx_api_keys_account ON api_keys(account_id);
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

-- ========================================
-- Funciones y Triggers
-- ========================================

CREATE OR REPLACE FUNCTION calculate_account_balance(account_id_param BIGINT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  total_balance DECIMAL(15,2) := 0.00;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type IN ('deposit', 'transfer_in', 'qr_payment') THEN amount
      WHEN movement_type IN ('withdrawal', 'transfer_out') THEN -amount
      ELSE 0
    END
  ), 0.00) INTO total_balance
  FROM account_movements
  WHERE account_id = account_id_param AND deleted_at IS NULL;
  RETURN total_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accounts
  SET
    balance = calculate_account_balance(COALESCE(NEW.account_id, OLD.account_id)),
    available_balance = calculate_account_balance(COALESCE(NEW.account_id, OLD.account_id)),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.account_id, OLD.account_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_balance
AFTER INSERT OR UPDATE OR DELETE ON account_movements
FOR EACH ROW
EXECUTE FUNCTION trigger_update_account_balance();

CREATE OR REPLACE FUNCTION trigger_update_payment_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_sync_updated_at
BEFORE UPDATE ON payment_sync_status
FOR EACH ROW
EXECUTE FUNCTION trigger_update_payment_sync_updated_at();

-- ========================================
-- INFRASTRUCTURE TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT PRIMARY KEY,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_idempotency_key ON idempotency_keys(idempotency_key);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- ========================================
-- MULTI-CURRENCY / FX
-- ========================================

CREATE TABLE IF NOT EXISTS fx_rates (
  id BIGINT PRIMARY KEY,
  base_currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  source VARCHAR(64) DEFAULT 'manual',
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(base_currency, target_currency, valid_from)
);

-- ========================================
-- FRAUD & ANOMALY DETECTION
-- ========================================

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  transfer_id BIGINT REFERENCES transfers(id),
  alert_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'medium',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by BIGINT REFERENCES users(id)
);

CREATE INDEX idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);

-- ========================================
-- BANK RECONCILIATION
-- ========================================

CREATE TABLE IF NOT EXISTS reconciliation_logs (
  id BIGINT PRIMARY KEY,
  bank_account_id BIGINT REFERENCES accounts(id),
  source VARCHAR(64) NOT NULL,
  external_reference VARCHAR(128),
  local_amount DECIMAL(18, 2) NOT NULL,
  bank_amount DECIMAL(18, 2) NOT NULL,
  difference DECIMAL(18, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recon_log_account ON reconciliation_logs(bank_account_id);
CREATE INDEX idx_recon_log_status ON reconciliation_logs(status);

-- ========================================
-- OUTGOING WEBHOOKS
-- ========================================

CREATE TABLE IF NOT EXISTS outgoing_webhooks (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  company_id BIGINT REFERENCES companies(id),
  url VARCHAR(1024) NOT NULL,
  secret VARCHAR(256),
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outgoing_webhook_jobs (
  id BIGINT PRIMARY KEY,
  webhook_id BIGINT REFERENCES outgoing_webhooks(id) ON DELETE CASCADE,
  event VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_user ON outgoing_webhooks(user_id);
CREATE INDEX idx_webhook_jobs_status ON outgoing_webhook_jobs(status);

-- ========================================
-- WALLET BACKUP (SEED PHRASES)
-- ========================================

CREATE TABLE IF NOT EXISTS wallet_backups (
  id BIGINT PRIMARY KEY,
  wallet_id BIGINT REFERENCES wallets(id),
  user_id BIGINT REFERENCES users(id),
  seed_phrase_hash VARCHAR(256) NOT NULL,
  encrypted_seed_phrase TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

CREATE INDEX idx_wallet_backup_wallet ON wallet_backups(wallet_id);

-- ========================================
-- SUBSCRIPTIONS (Pagos Recurrentes)
-- ========================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  receiver_wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  amount DECIMAL(18, 2) NOT NULL,
  description TEXT,
  interval_type VARCHAR(20) NOT NULL CHECK (interval_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  max_payments INTEGER,
  payment_count INTEGER DEFAULT 0,
  last_processed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subs_user ON subscriptions(user_id);
CREATE INDEX idx_subs_active ON subscriptions(is_active) WHERE is_active = TRUE;

-- ========================================
-- MERCHANTS (QR Comercio)
-- ========================================

CREATE TABLE IF NOT EXISTS merchants (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) UNIQUE,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  business_name VARCHAR(255) NOT NULL,
  business_category VARCHAR(100) NOT NULL,
  tax_id VARCHAR(50) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address TEXT,
  commission_rate DECIMAL(5, 2) DEFAULT 0.50,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_merchants_category ON merchants(business_category);
CREATE INDEX idx_merchants_verified ON merchants(is_verified) WHERE is_verified = TRUE;

-- ========================================
-- CASH AGENTS (Cash-in / Cash-out)
-- ========================================

CREATE TABLE IF NOT EXISTS cash_agents (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  operating_hours VARCHAR(255),
  balance DECIMAL(18, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cash_agents_location ON cash_agents(lat, lng);
CREATE INDEX idx_cash_agents_active ON cash_agents(is_active) WHERE is_active = TRUE;

-- ========================================
-- NFC OFFLINE (Pendientes de Sincronización)
-- ========================================

CREATE TABLE IF NOT EXISTS nfc_pending (
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

CREATE INDEX idx_nfc_pending_user ON nfc_pending(receiver_user_id);
CREATE INDEX idx_nfc_pending_status ON nfc_pending(status);

-- ========================================
-- AUDIT LOG (Inmutable)
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64),
  resource_id VARCHAR(64),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- ========================================
-- DEAD LETTER QUEUE (Reintentos fallidos)
-- ========================================

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id BIGINT PRIMARY KEY,
  queue_name VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
