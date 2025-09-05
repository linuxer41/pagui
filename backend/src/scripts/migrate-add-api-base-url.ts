import { query } from '../config/database';

export async function migrateAddApiBaseUrl() {
  try {
    console.log('🔄 Iniciando migración para agregar campo api_base_url...');
    
    // Verificar si el campo ya existe
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'third_bank_credentials' 
      AND column_name = 'api_base_url'
    `);
    
    if (checkColumn.rowCount && checkColumn.rowCount > 0) {
      console.log('✅ El campo api_base_url ya existe en la tabla third_bank_credentials');
      
      // Verificar si los registros ya tienen el campo poblado
      const checkData = await query(`
        SELECT COUNT(*) as count 
        FROM third_bank_credentials 
        WHERE api_base_url IS NULL OR api_base_url = ''
      `);
      
      if (parseInt(checkData.rows[0].count) === 0) {
        console.log('✅ Los registros ya tienen el campo api_base_url poblado');
        return;
      }
      
      console.log('🔄 Algunos registros no tienen el campo api_base_url poblado, actualizando...');
    }
    
    // Agregar el campo api_base_url
    console.log('📝 Agregando campo api_base_url...');
    await query(`
      ALTER TABLE third_bank_credentials 
      ADD COLUMN api_base_url VARCHAR(255) NOT NULL DEFAULT ''
    `);
    
    console.log('✅ Campo api_base_url agregado exitosamente');
    
    // Actualizar registros existentes con URLs por defecto
    console.log('🔄 Actualizando registros existentes...');
    
    // Actualizar credenciales de test (environment = 1)
    await query(`
      UPDATE third_bank_credentials 
      SET api_base_url = 'https://apimktdesa.baneco.com.bo/ApiGateway/'
      WHERE environment = 1
    `);
    
    // Actualizar credenciales de producción (environment = 2)
    await query(`
      UPDATE third_bank_credentials 
      SET api_base_url = 'https://apimkt.baneco.com.bo/ApiGateway/'
      WHERE environment = 2
    `);
    
    console.log('✅ Registros existentes actualizados con URLs por defecto');
    
    // Remover el valor por defecto del campo
    await query(`
      ALTER TABLE third_bank_credentials 
      ALTER COLUMN api_base_url DROP DEFAULT
    `);
    
    console.log('✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateAddApiBaseUrl()
    .then(() => {
      console.log('\n✅ Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en la migración:', error);
      process.exit(1);
    });
}
