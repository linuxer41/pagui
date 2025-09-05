import { pool, query, migrateDB } from '../config/database';
import { TEST_DATABASE_URL } from '../../test/setup.js';

/**
 * Script para configurar la base de datos de pruebas
 * Crea una base de datos separada para evitar interferencias con datos de desarrollo
 */

async function setupTestDatabase() {
  try {
    console.log('🧪 Configurando base de datos de pruebas...');
    
    // Verificar si estamos usando la base de datos de pruebas
    const currentUrl = process.env.DATABASE_URL;
    if (currentUrl !== TEST_DATABASE_URL) {
      console.log('⚠️  Configurando para usar base de datos de pruebas...');
      process.env.DATABASE_URL = TEST_DATABASE_URL;
    }

    // Aplicar esquema a la base de datos de pruebas
    console.log('📋 Aplicando esquema a la base de datos de pruebas...');
    await migrateDB(true); // Forzar reset para limpiar datos anteriores

    // Poblar con datos mínimos necesarios para pruebas
    console.log('🌱 Poblando datos mínimos para pruebas...');
    await seedTestData();

    console.log('✅ Base de datos de pruebas configurada correctamente');
  } catch (error) {
    console.error('❌ Error configurando base de datos de pruebas:', error);
    throw error;
  }
}

async function seedTestData() {
  try {
    // 1. Insertar credenciales bancarias de Banco Económico (Test)
    console.log('🏦 Insertando credenciales bancarias de Banco Económico (Test)...');
    
    const bankCredentialResult = await query(`
      INSERT INTO third_bank_credentials (account_number, account_type, account_name, merchant_id, username, password, encryption_key, environment, api_base_url, bank_branch, status)
      VALUES ('1041070599', 1, 'Cuenta Test Banco Económico', 'BANECO_TEST_MERCHANT', '1649710', '1234', '6F09E3167E1D40829207B01041A65B12', 1, 'https://apimktdesa.baneco.com.bo/ApiGateway/', 'La Paz', 'active')
      ON CONFLICT (environment) DO UPDATE SET 
        account_number = EXCLUDED.account_number,
        account_name = EXCLUDED.account_name,
        merchant_id = EXCLUDED.merchant_id,
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        encryption_key = EXCLUDED.encryption_key,
        api_base_url = EXCLUDED.api_base_url,
        bank_branch = EXCLUDED.bank_branch,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);
    
    const bankCredentialId = bankCredentialResult.rows[0]?.id;
    console.log(`Credencial bancaria de Banco Económico (Test): ${bankCredentialId}`);
    console.log(`   Usuario: 1649710`);
    console.log(`   Cuenta: 1041070599`);
    console.log(`   Entorno: Test (1)`);

    // 2. Insertar usuario administrador de prueba
    console.log('👤 Insertando usuario administrador de prueba...');
    
    const roleResult = await query(`SELECT id FROM roles WHERE name = 'COMPANY_ADMIN'`);
    const roleId = roleResult.rows[0]?.id;
    
    if (!roleId) {
      throw new Error('Rol COMPANY_ADMIN no encontrado');
    }

    // Generar hash de la contraseña
    const passwordHash = await Bun.password.hash('admin123', {
      algorithm: 'bcrypt',
      cost: 10
    });

    const userResult = await query(`
      INSERT INTO users (email, password, full_name, business_id, entity_type, identification_type, identification_number, role_id, third_bank_credential_id, is_primary_user, status)
      VALUES ('admin@pagui.com', $1, 'Usuario Admin de Pruebas', 'TEST-COMPANY', 'company', 'CI', '1234567890', $2, $3, true, 'active')
      ON CONFLICT (email) DO UPDATE SET 
        password = $1,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [passwordHash, roleId, bankCredentialId]);
    
    const userId = userResult.rows[0]?.id;
    console.log(`Usuario admin: ${userId}`);

    console.log('✅ Datos de prueba sembrados correctamente');
    console.log('🎯 Configuración de pruebas:');
    console.log(`   - Usuario: admin@pagui.com / admin123`);
    console.log(`   - Credencial bancaria: Banco Económico Test`);
    console.log(`   - API Base URL: https://apimktdesa.baneco.com.bo/ApiGateway/`);
    
  } catch (error) {
    console.error('❌ Error sembrando datos de prueba:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  setupTestDatabase()
    .then(() => {
      console.log('🎉 Configuración de base de datos de pruebas completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en configuración:', error);
      process.exit(1);
    });
}

export { setupTestDatabase, seedTestData };
