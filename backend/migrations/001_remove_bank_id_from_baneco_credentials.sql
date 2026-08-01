ALTER TABLE baneco_credentials DROP CONSTRAINT IF EXISTS baneco_credentials_bank_id_fkey;
ALTER TABLE baneco_credentials DROP COLUMN IF EXISTS bank_id;
ALTER TABLE baneco_credentials ALTER COLUMN encryption_key DROP NOT NULL;
