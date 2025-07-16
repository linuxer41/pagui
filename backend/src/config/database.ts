import { Pool, QueryResult, QueryResultRow } from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/payments';

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
      console.log('⏱️ Query lento:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (err) {
    console.error('❌ Error ejecutando query:', err);
    throw err;
  }
}

// Crear tablas iniciales si no existen
async function initDatabase() {
  try {
    // Tabla para empresas
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        business_id VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        contact_email VARCHAR(100) NOT NULL,
        contact_phone VARCHAR(20),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla para configuración de bancos
    await query(`
      CREATE TABLE IF NOT EXISTS banks (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        api_version VARCHAR(10),
        encryption_key TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla de usuarios con relación a empresa
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        company_id INTEGER REFERENCES companies(id),
        role VARCHAR(20) NOT NULL DEFAULT 'USER',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla para API keys
    await query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        api_key VARCHAR(64) UNIQUE NOT NULL,
        description TEXT,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        permissions JSONB NOT NULL,
        expires_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla para configuración de empresa-banco
    await query(`
      CREATE TABLE IF NOT EXISTS company_bank_configs (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        bank_id INTEGER NOT NULL REFERENCES banks(id),
        account_number VARCHAR(50),
        merchant_id VARCHAR(50),
        encryption_key TEXT,
        additional_config JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, bank_id)
      )
    `);
    
    // Tabla para los QR generados - actualizada con company_id y bank_id
    await query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        qr_id VARCHAR(50) UNIQUE NOT NULL,
        transaction_id VARCHAR(100) NOT NULL,
        account_credit TEXT NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        bank_id INTEGER NOT NULL REFERENCES banks(id),
        currency VARCHAR(3) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        due_date TIMESTAMP NOT NULL,
        single_use BOOLEAN NOT NULL,
        modify_amount BOOLEAN NOT NULL,
        branch_code VARCHAR(10),
        qr_image TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla para pagos de QR - actualizada con company_id y bank_id
    await query(`
      CREATE TABLE IF NOT EXISTS qr_payments (
        id SERIAL PRIMARY KEY,
        qr_id VARCHAR(50) NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        bank_id INTEGER NOT NULL REFERENCES banks(id),
        transaction_id VARCHAR(100) NOT NULL,
        payment_date TIMESTAMP NOT NULL,
        payment_time VARCHAR(10) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        sender_bank_code VARCHAR(20) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_document_id VARCHAR(50) NOT NULL,
        sender_account VARCHAR(50) NOT NULL,
        description TEXT,
        branch_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (qr_id) REFERENCES qr_codes(qr_id)
      )
    `);
    
    // Tabla para registro de actividad y monitoreo - actualizada con company_id
    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        action_type VARCHAR(50) NOT NULL,
        action_details JSONB,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insertar banco económico por defecto
    const bankCheck = await query('SELECT * FROM banks WHERE code = $1', ['1016']);
    if (bankCheck.rowCount === 0) {
      await query(
        'INSERT INTO banks (code, name, api_version, encryption_key) VALUES ($1, $2, $3, $4)',
        ['1016', 'Banco Económico', 'v1.3', '40A318B299F245C2B']
      );
    }
    
    // Insertar empresa de demostración
    const companyCheck = await query('SELECT * FROM companies WHERE business_id = $1', ['DEMO-COMPANY']);
    let companyId = null;
    
    if (companyCheck.rowCount === 0) {
      const companyResult = await query(
        'INSERT INTO companies (name, business_id, contact_email) VALUES ($1, $2, $3) RETURNING id',
        ['Empresa Demo', 'DEMO-COMPANY', 'demo@example.com']
      );
      companyId = companyResult.rows[0].id;
    } else {
      companyId = companyCheck.rows[0].id;
    }
    
    // Obtener ID del banco económico
    const bankResult = await query('SELECT id FROM banks WHERE code = $1', ['1016']);
    const bankId = bankResult.rows[0].id;
    
    // Configuración empresa-banco para la demostración
    const configCheck = await query(
      'SELECT * FROM company_bank_configs WHERE company_id = $1 AND bank_id = $2',
      [companyId, bankId]
    );
    
    if (configCheck.rowCount === 0) {
      await query(
        'INSERT INTO company_bank_configs (company_id, bank_id, account_number, encryption_key) VALUES ($1, $2, $3, $4)',
        [companyId, bankId, '123456789', '40A318B299F245C2B']
      );
    }
    
    // Insertar usuario de prueba si no existe
    const userCheck = await query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);
    if (userCheck.rowCount === 0) {
      await query(
        'INSERT INTO users (email, password, full_name, company_id, role) VALUES ($1, $2, $3, $4, $5)',
        ['admin@example.com', '1234', 'Usuario Demo', companyId, 'ADMIN']
      );
    }
    
    // Generar API key de demostración
    const apiKeyCheck = await query('SELECT * FROM api_keys WHERE company_id = $1', [companyId]);
    if (apiKeyCheck.rowCount === 0) {
      const apiKey = generateApiKey();
      await query(
        'INSERT INTO api_keys (api_key, description, company_id, permissions) VALUES ($1, $2, $3, $4)',
        [
          apiKey, 
          'API Key de demostración', 
          companyId, 
          JSON.stringify({
            qr_generate: true,
            qr_status: true,
            qr_cancel: true
          })
        ]
      );
      console.log('📝 API Key de demostración generada:', apiKey);
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

export { pool, query, testConnection, initDatabase, generateApiKey }; 