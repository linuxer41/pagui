import { query } from '../config/database';

/**
 * Script para agregar la restricción única faltante en auth_tokens
 * Esto es necesario para que la cláusula ON CONFLICT funcione correctamente
 */

async function addAuthTokensConstraint() {
  try {
    console.log('🔧 Agregando restricción única a auth_tokens...');
    
    // Verificar si la restricción ya existe
    const constraintExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auth_tokens_user_type_unique'
        AND table_name = 'auth_tokens'
      );
    `);
    
    if (constraintExists.rows[0].exists) {
      console.log('✅ La restricción ya existe');
      return;
    }
    
    // Agregar la restricción única
    await query(`
      ALTER TABLE auth_tokens 
      ADD CONSTRAINT auth_tokens_user_type_unique 
      UNIQUE (user_id, token_type);
    `);
    
    console.log('✅ Restricción única agregada correctamente');
    
  } catch (error) {
    console.error('❌ Error agregando restricción:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  addAuthTokensConstraint()
    .then(() => {
      console.log('🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export { addAuthTokensConstraint };
