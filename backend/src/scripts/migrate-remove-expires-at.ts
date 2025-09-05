import { query } from '../config/database';

/**
 * Script para eliminar el campo expires_at de la tabla auth_tokens
 * Los tokens JWT ahora se decodifican para verificar expiración
 */

async function removeExpiresAtField() {
  try {
    console.log('🔧 Eliminando campo expires_at de auth_tokens...');
    
    // Verificar si el campo existe
    const columnExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_tokens' 
        AND column_name = 'expires_at'
      );
    `);
    
    if (!columnExists.rows[0].exists) {
      console.log('✅ El campo expires_at ya no existe');
      return;
    }
    
    // Eliminar el campo expires_at
    await query(`
      ALTER TABLE auth_tokens 
      DROP COLUMN expires_at;
    `);
    
    console.log('✅ Campo expires_at eliminado correctamente');
    
    // Actualizar la descripción de la tabla en el esquema
    console.log('📝 Actualizando esquema de la base de datos...');
    
  } catch (error) {
    console.error('❌ Error eliminando campo expires_at:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  removeExpiresAtField()
    .then(() => {
      console.log('🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export { removeExpiresAtField };
