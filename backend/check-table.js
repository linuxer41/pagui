import { query } from './src/config/database.js';

async function checkTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla auth_tokens...');
    
    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'auth_tokens'
      );
    `);
    
    console.log('Tabla auth_tokens existe:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Verificar estructura de la tabla
      const structure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'auth_tokens'
        ORDER BY ordinal_position;
      `);
      
      console.log('📊 Estructura de la tabla:');
      structure.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Verificar si hay datos
      const count = await query('SELECT COUNT(*) as count FROM auth_tokens');
      console.log('📊 Total de registros:', count.rows[0].count);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkTable();
