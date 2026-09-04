-- 006 - Comisión 0.1% por defecto y descuento 0.05% si >200k (tiered)
-- Corrige commission_rate mal configurado (0.1 = 10% -> 0.001 = 0.1%)

-- 1) Añadir columnas para descuento por volumen
ALTER TABLE collection_config
  ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_threshold DECIMAL(15,2) NOT NULL DEFAULT 200000,
  ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(10,6) NOT NULL DEFAULT 0.0005;

-- 2) Corregir tasas existentes: 0, 0.1, 10% etc -> 0.001 (0.1%)
-- 0.1 en base fraccional era 10%, ahora debe ser 0.001
UPDATE collection_config SET commission_rate = 0.001
WHERE commission_rate IS NULL OR commission_rate = 0 OR commission_rate >= 0.01;

-- Asegurar discount_rate correcto
UPDATE collection_config SET discount_rate = 0.0005 WHERE discount_rate IS NULL OR discount_rate = 0;

-- 3) Tanner: marcar has_discount para testing? No, queda false por defecto (admin lo activa por empresa)
-- Ejemplo: UPDATE collection_config SET discount_enabled = true WHERE wallet_id IN (...);
