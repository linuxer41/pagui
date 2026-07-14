-- Migration 001: Initial schema
-- Up: creates all tables

-- Migration tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER NOT NULL DEFAULT 0
);

-- Import main schema
-- NOTE: in production, use `\i schema.sql` or load via migrate.ts
