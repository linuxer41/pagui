ALTER TABLE baneco_credentials DROP CONSTRAINT IF EXISTS baneco_credentials_user_id_fkey;
ALTER TABLE baneco_credentials DROP COLUMN IF EXISTS user_id;
ALTER TABLE baneco_credentials ADD COLUMN IF NOT EXISTS tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_user_id_fkey;
ALTER TABLE bank_accounts DROP COLUMN IF EXISTS user_id;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE bank_accounts ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE collection_config DROP CONSTRAINT IF EXISTS collection_config_user_id_fkey;
ALTER TABLE collection_config DROP COLUMN IF EXISTS user_id;
