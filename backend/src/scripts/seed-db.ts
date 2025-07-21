import { pool, query } from '../config/database';

export async function seedDatabase() {
  try {
    console.log('Poblando la base de datos con datos iniciales...');
    
    // Obtener variables de entorno
    const encryptionKey = '6F09E3167E1D40829207B01041A65B12';
    const banecoApiUrl = 'https://apimktdesa.baneco.com.bo/ApiGateway/';
    const banecoUsername = '1649710';
    const banecoPassword = '1234';
    const banecoAccount = '1041070599';

    const defaultUser = 'admin@example.com';
    const defaultPassword = '1234';

    const bnbApiUrl = 'https://api-sandbox.bnb.com.bo/';
    
    console.log('Usando configuración:');
    console.log(`- Llave de encriptación: ${encryptionKey}`);
    console.log(`- URL API Banco Económico: ${banecoApiUrl}`);
    console.log(`- Usuario: ${banecoUsername}`);
    console.log(`- Cuenta: ${banecoAccount}`);
    
    // 1. Insertar bancos
    console.log('Insertando datos de los bancos...');
    
    // Banco Económico
    const banecoResult = await query(`
      INSERT INTO banks (code, name, api_version, encryption_key, test_api_url, prod_api_url, status)
      VALUES ('1016', 'Banco Económico', 'v1.3', $1, $2, $3, 'ACTIVE')
      ON CONFLICT (code) 
      DO UPDATE SET 
        encryption_key = $1,
        test_api_url = $2,
        prod_api_url = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [encryptionKey, 'https://apimktdesa.baneco.com.bo/ApiGateway/', 'https://apimktdesa.baneco.com.bo/ApiGateway/']);
    
    const banecoId = banecoResult.rows[0]?.id;
    console.log(`Banco Económico insertado/actualizado con ID: ${banecoId}`);
    
    // Banco BNB
    const bnbResult = await query(`
      INSERT INTO banks (code, name, api_version, encryption_key, test_api_url, prod_api_url, status)
      VALUES ('1001', 'Banco Nacional de Bolivia (BNB)', 'v1.0', $1, $2, $3, 'ACTIVE')
      ON CONFLICT (code) 
      DO UPDATE SET 
        encryption_key = $1,
        test_api_url = $2,
        prod_api_url = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [encryptionKey, bnbApiUrl, bnbApiUrl]);
    
    const bnbId = bnbResult.rows[0]?.id;
    console.log(`Banco BNB insertado/actualizado con ID: ${bnbId}`);
    
    // Banco BISA
    const bisaResult = await query(`
      INSERT INTO banks (code, name, api_version, encryption_key, test_api_url, prod_api_url, status)
      VALUES ('1003', 'Banco BISA', 'v1.0', $1, $2, $3, 'ACTIVE')
      ON CONFLICT (code) 
      DO UPDATE SET 
        encryption_key = $1,
        test_api_url = $2,
        prod_api_url = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [encryptionKey, 'https://api-test.grupobisa.com/', 'https://api-test.grupobisa.com/']);
    
    const bisaId = bisaResult.rows[0]?.id;
    console.log(`Banco BISA insertado/actualizado con ID: ${bisaId}`);
    
    // 2. Insertar empresa de demostración
    console.log('Insertando empresa de demostración...');
    const companyResult = await query(`
      INSERT INTO companies (name, business_id, contact_email, status)
      VALUES ('Empresa Demo', 'DEMO-COMPANY', 'demo@example.com', 'ACTIVE')
      ON CONFLICT (business_id) 
      DO UPDATE SET 
        name = 'Empresa Demo',
        contact_email = 'demo@example.com',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);
    
    const companyId = companyResult.rows[0]?.id;
    console.log(`Empresa insertada/actualizada con ID: ${companyId}`);
    
    // 3. Insertar usuario administrador
    console.log('Insertando usuario administrador...');
    // Generar hash de la contraseña
    const passwordHash = await Bun.password.hash(defaultPassword, {
      algorithm: 'bcrypt',
      cost: 10
    });
    
    const userResult = await query(`
      INSERT INTO users (email, password, full_name, company_id, role, status)
      VALUES ($1, $2, 'Usuario Demo', $3, 'ADMIN', 'ACTIVE')
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [defaultUser, passwordHash, companyId]);
    
    const userId = userResult.rows[0]?.id;
    console.log(`Usuario insertado/actualizado con ID: ${userId}`);
    
    // 4. Configurar relación empresa-banco para los tres bancos
    console.log('Configurando relación empresa-banco para Banco Económico...');
    await query(`
      INSERT INTO company_bank_configs (company_id, bank_id, account_number, account_username, account_password, merchant_id, encryption_key, environment, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 2, 'ACTIVE')
      ON CONFLICT (company_id, bank_id) 
      DO UPDATE SET 
        account_number = $3,
        account_username = $4,
        account_password = $5,
        merchant_id = $6,
        encryption_key = $7,
        environment = 2,
        updated_at = CURRENT_TIMESTAMP
    `, [companyId, banecoId, banecoAccount, banecoUsername, banecoPassword, 'BANECO_MERCHANT', encryptionKey]);
    
    console.log('Configurando relación empresa-banco para BNB...');
    await query(`
      INSERT INTO company_bank_configs (company_id, bank_id, account_number, account_username, account_password, merchant_id, encryption_key, environment, status)
      VALUES ($1, $2, '10010000001', 'bnb_user', 'bnb_pass', 'BNB_MERCHANT', $3, 2, 'ACTIVE')
      ON CONFLICT (company_id, bank_id) 
      DO UPDATE SET 
        account_number = '10010000001',
        account_username = 'bnb_user',
        account_password = 'bnb_pass',
        merchant_id = 'BNB_MERCHANT',
        encryption_key = $3,
        environment = 2,
        updated_at = CURRENT_TIMESTAMP
    `, [companyId, bnbId, encryptionKey]);
    
    console.log('Configurando relación empresa-banco para BISA...');
    await query(`
      INSERT INTO company_bank_configs (company_id, bank_id, account_number, account_username, account_password, merchant_id, encryption_key, environment, status)
      VALUES ($1, $2, '10030000001', 'bisa_user', 'bisa_pass', 'BISA_MERCHANT', $3, 2, 'ACTIVE')
      ON CONFLICT (company_id, bank_id) 
      DO UPDATE SET 
        account_number = '10030000001',
        account_username = 'bisa_user',
        account_password = 'bisa_pass',
        merchant_id = 'BISA_MERCHANT',
        encryption_key = $3,
        environment = 2,
        updated_at = CURRENT_TIMESTAMP
    `, [companyId, bisaId, encryptionKey]);
    
    console.log('Configuración empresa-banco actualizada para los tres bancos');
    
    // 5. Crear una API key para la empresa
    console.log('Creando API key para la empresa...');
    
    // Generar una API key aleatoria
    const apiKey = generateApiKey();
    
    // Definir permisos
    const permissions = {
      qr: {
        generate: true,
        cancel: true,
        check: true
      },
      payments: {
        list: true
      }
    };
    
    // Fecha de expiración (1 año)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    
    await query(`
      INSERT INTO api_keys (api_key, description, company_id, permissions, expires_at, status)
      VALUES ($1, 'API Key de demostración', $2, $3, $4, 'ACTIVE')
      ON CONFLICT (api_key) 
      DO NOTHING
    `, [apiKey, companyId, JSON.stringify(permissions), expiresAt.toISOString()]);
    
    console.log(`API key generada: ${apiKey}`);
    
    // 6. Crear tokens de autenticación de ejemplo con información de dispositivo
    console.log('Creando tokens de autenticación de ejemplo...');
    
    // Generar un token JWT de ejemplo (no es un JWT real, solo para demostración)
    const demoAccessToken = generateApiKey(64);
    const demoRefreshToken = generateApiKey(64);
    
    // Fechas de expiración
    const accessTokenExpiry = new Date();
    accessTokenExpiry.setHours(accessTokenExpiry.getHours() + 24); // 24 horas
    
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30); // 30 días
    
    // Información de dispositivos de ejemplo
    const deviceInfos = [
      {
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        deviceType: 'Desktop - Windows'
      },
      {
        ip: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        deviceType: 'Mobile - iOS'
      },
      {
        ip: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
        deviceType: 'Mobile - Android'
      }
    ];
    
    // Insertar tokens de acceso para diferentes dispositivos
    for (const device of deviceInfos) {
      const token = generateApiKey(64);
      
      await query(`
        INSERT INTO auth_tokens (
          user_id, 
          token_type, 
          token, 
          expires_at, 
          used_times, 
          ip_address, 
          user_agent
        ) VALUES (
          $1, 'ACCESS_TOKEN', $2, $3, 0, $4, $5
        )
      `, [
        userId,
        token,
        accessTokenExpiry.toISOString(),
        device.ip,
        `${device.userAgent} | ${device.deviceType}`
      ]);
      
      // También insertar un refresh token para cada dispositivo
      await query(`
        INSERT INTO auth_tokens (
          user_id, 
          token_type, 
          token, 
          expires_at, 
          used_times, 
          ip_address, 
          user_agent
        ) VALUES (
          $1, 'REFRESH_TOKEN', $2, $3, 0, $4, $5
        )
      `, [
        userId,
        generateApiKey(64),
        refreshTokenExpiry.toISOString(),
        device.ip,
        `${device.userAgent} | ${device.deviceType}`
      ]);
    }
    
    console.log('Tokens de autenticación creados para diferentes dispositivos');
    
    console.log('Base de datos poblada correctamente.');
    
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    // await pool.end();  // Eliminamos esta línea que cierra la conexión
  }
}

// Función para generar una API key aleatoria
function generateApiKey(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  
  return result;
}

// Ejecutar la función principal
if (require.main === module) {
  seedDatabase();
}
// seedDatabase();