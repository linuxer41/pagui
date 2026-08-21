ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS baneco_environment VARCHAR(16);

COMMENT ON COLUMN qr_codes.baneco_environment IS 'Entorno (prod|sandbox) usado al generar el QR, para que el sync reutilice la misma credencial y evite desajustes de entorno';
