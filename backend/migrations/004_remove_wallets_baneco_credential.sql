-- El vínculo a la credencial Baneco ya vive en collection_config.
-- Se elimina la columna redundante de wallets.
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_baneco_credential_id_fkey;
ALTER TABLE wallets DROP COLUMN IF EXISTS baneco_credential_id;
