import { pool, query } from '../config/database';

export async function seedDatabase() {
  try {
    console.log('Poblando la base de datos con datos iniciales...');
    
    // Obtener variables de entorno
    const banecoApiUrl = 'https://apimktdesa.baneco.com.bo/ApiGateway/';
    const banecoUsername = '1649710';
    const banecoPassword = '1234';
    const banecoAccount = '1041070599';

    const defaultUser = 'admin@example.com';
    const defaultPassword = '1234';

    const bnbApiUrl = 'https://api-sandbox.bnb.com.bo/';
    
    console.log('Usando configuración:');
    console.log(`- URL API Banco Económico: ${banecoApiUrl}`);
    console.log(`- Usuario: ${banecoUsername}`);
    console.log(`- Cuenta: ${banecoAccount}`);
    
    // 1. Insertar bancos
    console.log('Insertando datos de los bancos...');
    
    // Banco Económico
    const banecoResult = await query(`
      INSERT INTO banks (code, name, api_version, test_api_url, prod_api_url, status)
      VALUES ('1016', 'Banco Económico', 'v1.3', $1, $2, 'ACTIVE')
      ON CONFLICT (code) 
      DO UPDATE SET 
        test_api_url = $1,
        prod_api_url = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, ['https://apimktdesa.baneco.com.bo/ApiGateway/', 'https://apimktdesa.baneco.com.bo/ApiGateway/']);
    
    const banecoId = banecoResult.rows[0]?.id;
    console.log(`Banco Económico insertado/actualizado con ID: ${banecoId}`);
    
    // Banco BNB
    const bnbResult = await query(`
      INSERT INTO banks (code, name, api_version, test_api_url, prod_api_url, status)
      VALUES ('1001', 'Banco Nacional de Bolivia (BNB)', 'v1.0', $1, $2, 'ACTIVE')
      ON CONFLICT (code) 
      DO UPDATE SET 
        test_api_url = $1,
        prod_api_url = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [bnbApiUrl, bnbApiUrl]);
    
    const bnbId = bnbResult.rows[0]?.id;
    console.log(`Banco BNB insertado/actualizado con ID: ${bnbId}`);
    
    // Banco BISA
    const bisaResult = await query(`
      INSERT INTO banks (code, name, api_version, test_api_url, prod_api_url, status)
      VALUES ('1003', 'Banco BISA', 'v1.0', $1, $2, 'ACTIVE')
      ON CONFLICT (code) 
      DO UPDATE SET 
        test_api_url = $1,
        prod_api_url = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, ['https://api-test.grupobisa.com/', 'https://api-test.grupobisa.com/']);
    
    const bisaId = bisaResult.rows[0]?.id;
    console.log(`Banco BISA insertado/actualizado con ID: ${bisaId}`);
    
    // 2. Insertar empresa de demostración
    console.log('Insertando empresa de demostración...');
    const companyResult = await query(`
      INSERT INTO companies (name, business_id, type, document_id, contact_email, status)
      VALUES ('Empresa Demo', 'DEMO-COMPANY', 'company', '1234567890', 'demo@example.com', 'ACTIVE')
      ON CONFLICT (business_id) 
      DO UPDATE SET 
        name = 'Empresa Demo',
        contact_email = 'demo@example.com',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);
    
    const companyId = companyResult.rows[0]?.id;
    console.log(`Empresa insertada/actualizada con ID: ${companyId}`);
    
    // 3. Insertar roles (si no existen)
    // Los roles ya se insertan en el schema.sql
    
    // 4. Insertar usuario administrador
    console.log('Insertando usuario administrador...');
    
    // Obtener el ID del rol COMPANY_ADMIN
    const roleResult = await query(`SELECT id FROM roles WHERE name = 'COMPANY_ADMIN'`);
    const roleId = roleResult.rows[0]?.id;
    
    if (!roleId) {
      console.log('Error: Rol COMPANY_ADMIN no encontrado');
      return;
    }
    
    // Generar hash de la contraseña
    const passwordHash = await Bun.password.hash(defaultPassword, {
      algorithm: 'bcrypt',
      cost: 10
    });
    
    const userResult = await query(`
      INSERT INTO users (email, password, full_name, role_id, company_id, status)
      VALUES ($1, $2, 'Usuario Demo', $3, $4, 'ACTIVE')
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [defaultUser, passwordHash, roleId, companyId]);
    
    const userId = userResult.rows[0]?.id;
    console.log(`Usuario insertado/actualizado con ID: ${userId}`);
    
    // 5. Configurar relación empresa-banco para los tres bancos
    console.log('Configurando relación empresa-banco para Banco Económico...');
    await query(`
      INSERT INTO company_bank (company_id, bank_id, account_number, account_type, account_name, merchant_id, additional_config, environment, status)
      VALUES ($1, $2, $3, 1, 'Cuenta Principal', $4, $5, 2, 'ACTIVE')
      ON CONFLICT (company_id, bank_id) 
      DO UPDATE SET 
        account_number = $3,
        merchant_id = $4,
        additional_config = $5,
        environment = 2,
        updated_at = CURRENT_TIMESTAMP
    `, [
      companyId, 
      banecoId, 
      banecoAccount, 
      'BANECO_MERCHANT',
      JSON.stringify({
        username: banecoUsername,
        password: banecoPassword
      })
    ]);
    
    console.log('Configurando relación empresa-banco para BNB...');
    await query(`
      INSERT INTO company_bank (company_id, bank_id, account_number, account_type, account_name, merchant_id, additional_config, environment, status)
      VALUES ($1, $2, '10010000001', 1, 'Cuenta Principal', 'BNB_MERCHANT', $3, 2, 'ACTIVE')
      ON CONFLICT (company_id, bank_id) 
      DO UPDATE SET 
        account_number = '10010000001',
        merchant_id = 'BNB_MERCHANT',
        additional_config = $3,
        environment = 2,
        updated_at = CURRENT_TIMESTAMP
    `, [
      companyId, 
      bnbId, 
      JSON.stringify({
        username: 'bnb_user',
        password: 'bnb_pass'
      })
    ]);
    
    console.log('Configurando relación empresa-banco para BISA...');
    await query(`
      INSERT INTO company_bank (company_id, bank_id, account_number, account_type, account_name, merchant_id, additional_config, environment, status)
      VALUES ($1, $2, '10030000001', 1, 'Cuenta Principal', 'BISA_MERCHANT', $3, 2, 'ACTIVE')
      ON CONFLICT (company_id, bank_id) 
      DO UPDATE SET 
        account_number = '10030000001',
        merchant_id = 'BISA_MERCHANT',
        additional_config = $3,
        environment = 2,
        updated_at = CURRENT_TIMESTAMP
    `, [
      companyId, 
      bisaId, 
      JSON.stringify({
        username: 'bisa_user',
        password: 'bisa_pass'
      })
    ]);
    
    console.log('Configuración empresa-banco actualizada para los tres bancos');
    
    // 6. Crear una API key para la empresa
    console.log('Creando API key para la empresa...');
    
    // Generar una API key aleatoria
    const apiKey = generateApiKey();
    
    // Definir permisos
    const permissions = {
      qr_codes: {
        create: true,
        read: true
      },
      transactions: {
        read: true
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
    
    // 7. Crear tokens de autenticación de ejemplo
    console.log('Creando tokens de autenticación de ejemplo...');
    
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
    
    // Fechas de expiración
    const accessTokenExpiry = new Date();
    accessTokenExpiry.setHours(accessTokenExpiry.getHours() + 24); // 24 horas
    
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30); // 30 días
    
    // Insertar tokens de acceso para diferentes dispositivos
    for (const device of deviceInfos) {
      // Crear token de acceso
      await query(`
        INSERT INTO auth_tokens (
          user_id, 
          token_type, 
          token, 
          expires_at, 
          ip_address, 
          user_agent
        ) VALUES (
          $1, 'REFRESH_TOKEN', $2, $3, $4, $5
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