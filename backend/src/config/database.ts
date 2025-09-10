import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool, QueryResult, QueryResultRow } from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/payments';

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Verificar conexión a la base de datos
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
    client.release();
  } catch (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err);
  }
}

// Ejecutar SQL con parámetros (para prevenir SQL injection)
async function query<T extends QueryResultRow>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  try {
    const start = Date.now();
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log para monitoreo de queries lentos
    if (duration > 100) {
      // console.log('⏱️ Query lento:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (err) {
    console.error('❌ Error ejecutando query:', err);
    throw err;
  }
}

// Crear tablas iniciales si no existen
async function migrateDB(reset: boolean = false) {
  try {
    //  check if tables exist
    const tables = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']);
    if (tables.rowCount === 0 || reset) {
      // read schema.sql
      const schema = readFileSync('schema.sql', 'utf8');
      await pool.query(schema);
    } else {
      // Forzar actualización del esquema para aplicar los nuevos estados
      console.log('🔄 Actualizando esquema existente...');
      const schema = readFileSync('schema.sql', 'utf8');
      await pool.query(schema);
    }

    console.log('✅ Base de datos inicializada correctamente');
  } catch (err) {
    console.error('❌ Error al inicializar la base de datos:', err);
    throw err;
  }
}

// Función para generar API keys aleatorias
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const length = 40;
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

export { pool, query, testConnection, migrateDB, generateApiKey }; 