-- 008 - outgoing_webhooks.secret nunca puede ser null
-- Nadie escribe esta columna: la firma HMAC-SHA256 del payload se hace con la API Key activa
-- de la billetera (ver webhook.service.processPendingJobs). Estando NOT NULL sin default, el
-- INSERT de registerWebhook fallaba con 23502 y POST /webhooks no registraba nada. El default
-- '' mantiene la columna obligatoria y dice que el webhook firma con la clave de la billetera.
UPDATE outgoing_webhooks SET secret = '' WHERE secret IS NULL;
ALTER TABLE outgoing_webhooks ALTER COLUMN secret SET DEFAULT '';
ALTER TABLE outgoing_webhooks ALTER COLUMN secret SET NOT NULL;

COMMENT ON COLUMN outgoing_webhooks.secret
  IS 'Vacio = la firma HMAC-SHA256 usa la API Key de la billetera; reservado para un secret propio por webhook';
