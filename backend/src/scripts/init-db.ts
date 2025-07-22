import { migrateDB, testConnection } from '../config/database';
import { seedDatabase } from './seed-db';
import migrateTransactions from './migrate-transactions';
import { readFileSync } from 'fs';
import path from 'path';
import { pool } from '../config/database';

/**
 * Script para inicializar la base de datos con la nueva estructura
 * y migrar los datos existentes
 */
async function initializeDatabase() {
  try {
    console.log('🔄 Iniciando proceso de inicialización de la base de datos...');
    
    // Probar conexión a la base de datos
    await testConnection();
    
    // Verificar si se debe usar el esquema actualizado
    const useUpdatedSchema = process.argv.includes('--use-updated-schema');
    
    if (useUpdatedSchema) {
      console.log('🔄 Usando el esquema actualizado (schema_updated.sql)...');
      
      // Leer el archivo de esquema actualizado
      const schemaPath = path.join(process.cwd(), 'schema_updated.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      // Ejecutar el esquema actualizado
      const client = await pool.connect();
      try {
        await client.query(schema);
        console.log('✅ Esquema actualizado aplicado correctamente.');
      } catch (error) {
        console.error('❌ Error al aplicar el esquema actualizado:', error);
        throw error;
      } finally {
        client.release();
      }
      
      // Ejecutar la migración de datos
      console.log('🔄 Migrando datos existentes a la nueva estructura...');
      await migrateTransactions();
    } else {
      // Inicializar la base de datos con el esquema original
      console.log('🔄 Usando el esquema original...');
      await migrateDB();
    }
    
    // Ejecutar el seed de datos
    if (process.argv.includes('--with-seed')) {
      console.log('🌱 Ejecutando seed de la base de datos...');
      await seedDatabase();
    }
    
    console.log('✅ Base de datos inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar la inicialización si este script se ejecuta directamente
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Proceso de inicialización finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso de inicialización:', error);
      process.exit(1);
    });
}

export default initializeDatabase; 