#!/usr/bin/env node

/**
 * Script para ejecutar la migración que elimina el campo expires_at
 * de la tabla auth_tokens
 */

import { removeExpiresAtField } from './src/scripts/migrate-remove-expires-at.ts';

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración para eliminar campo expires_at...');
    
    await removeExpiresAtField();
    
    console.log('✅ Migración completada exitosamente');
    console.log('📝 Los tokens JWT ahora se verifican automáticamente por expiración');
    console.log('🔒 Solo se puede revocar tokens desde la base de datos');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

runMigration();
