-- 007 - Notas de débito para comisiones de recaudación
CREATE TABLE IF NOT EXISTS debit_notes (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  correlative VARCHAR(50) NOT NULL UNIQUE,
  period_label VARCHAR(20) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  qr_id VARCHAR(50) REFERENCES qr_codes(qr_id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_debit_notes_tenant ON debit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_status ON debit_notes(status);
CREATE INDEX IF NOT EXISTS idx_debit_notes_qr ON debit_notes(qr_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_period ON debit_notes(year, month);
