import fs from 'node:fs';
import path from 'node:path';
import { pool, query } from '../config/database';
import { loadEnv } from './load-env';

// Cargar variables de entorno
loadEnv();

/**
 * Script para inicializar la base de datos con el esquema SQL
 * Ejecutar con: bun run src/scripts/init-db.ts
 */
async function initializeDatabase() {
  try {
    console.log('Inicializando base de datos...');
    
    // Leer el archivo SQL
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Ejecutar el script SQL
    console.log('Ejecutando script SQL...');
    await query(schemaSql);
    
    console.log('Base de datos inicializada correctamente.');
    
    // Verificar que las tablas se hayan creado
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Tablas creadas:');
    tablesResult.rows.forEach((table: any) => {
      console.log(`- ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar la función principal
initializeDatabase(); 