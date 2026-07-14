-- Migration 002: New feature tables (webhooks, subscriptions, merchants, etc.)

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

CREATE INDEX IF NOT EXISTS idx_webhook_user ON outgoing_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_jobs_status ON outgoing_webhook_jobs(status);

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

CREATE INDEX IF NOT EXISTS idx_wallet_backup_wallet ON wallet_backups(wallet_id);

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

CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_active ON subscriptions(is_active) WHERE is_active = TRUE;

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

CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(business_category);
CREATE INDEX IF NOT EXISTS idx_merchants_verified ON merchants(is_verified) WHERE is_verified = TRUE;

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

CREATE INDEX IF NOT EXISTS idx_cash_agents_location ON cash_agents(lat, lng);
CREATE INDEX IF NOT EXISTS idx_cash_agents_active ON cash_agents(is_active) WHERE is_active = TRUE;

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

CREATE INDEX IF NOT EXISTS idx_nfc_pending_user ON nfc_pending(receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_pending_status ON nfc_pending(status);

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

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id BIGINT PRIMARY KEY,
  queue_name VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_records (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  kyc_level VARCHAR(20) NOT NULL DEFAULT 'none',
  document_type VARCHAR(20),
  document_number VARCHAR(50),
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_records(status);

CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id BIGINT REFERENCES devices(id) ON DELETE CASCADE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_tokens(user_id);

CREATE TABLE IF NOT EXISTS biometric_credentials (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_type VARCHAR(20) NOT NULL CHECK (credential_type IN ('fingerprint', 'face_id')),
  credential_key_hash VARCHAR(256) NOT NULL,
  encrypted_credential TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_biometric_user ON biometric_credentials(user_id);

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id BIGINT PRIMARY KEY,
  table_name VARCHAR(64) NOT NULL,
  retention_days INTEGER NOT NULL,
  archive_to VARCHAR(128),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_retention_logs (
  id BIGINT PRIMARY KEY,
  policy_id BIGINT REFERENCES data_retention_policies(id),
  table_name VARCHAR(64) NOT NULL,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  rows_archived INTEGER NOT NULL DEFAULT 0,
  dry_run BOOLEAN DEFAULT FALSE,
  executed_by BIGINT REFERENCES users(id),
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
