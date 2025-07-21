-- Script de migración para cambiar la columna is_used a used_times
-- Este script debe ejecutarse en la base de datos de producción

-- Paso 1: Añadir la nueva columna used_times
ALTER TABLE auth_tokens ADD COLUMN used_times INTEGER DEFAULT 0;

-- Paso 2: Actualizar los valores existentes (si is_used es true, used_times será 1)
UPDATE auth_tokens SET used_times = 1 WHERE is_used = TRUE;

-- Paso 3: Eliminar la columna is_used
ALTER TABLE auth_tokens DROP COLUMN is_used;

-- Paso 4: Crear un índice para mejorar el rendimiento de consultas
CREATE INDEX idx_auth_tokens_used_times ON auth_tokens(used_times);

-- Paso 5: Registrar la migración en el log
INSERT INTO activity_logs (action_type, action_details, status)
VALUES ('DATABASE_MIGRATION', 
        '{"description": "Migración de columna is_used a used_times en tabla auth_tokens"}', 
        'SUCCESS');

-- Nota: Asegúrate de hacer un respaldo de la base de datos antes de ejecutar esta migración 