import { query } from '../config/database';
import { userService } from '../services/user.service';

export async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');
    
    // 1. Insertar roles predefinidos (simplificados según el esquema actual)
    console.log('Insertando roles predefinidos...');
    
    const superAdminRole = await query(`
      INSERT INTO roles (name, description, permissions)
      VALUES ('admin', 'Administrador del sistema', '{"all": true}')
      ON CONFLICT (name) DO UPDATE SET 
        description = 'Administrador del sistema',
        permissions = '{"all": true}'
      RETURNING id
    `);
    
    const userRole = await query(`
      INSERT INTO roles (name, description, permissions)
      VALUES ('user', 'Usuario estándar', '{"basic": true}')
      ON CONFLICT (name) DO UPDATE SET 
        description = 'Usuario estándar',
        permissions = '{"basic": true}'
      RETURNING id
    `);
    
    const managerRole = await query(`
      INSERT INTO roles (name, description, permissions)
      VALUES ('manager', 'Gerente', '{"management": true}')
      ON CONFLICT (name) DO UPDATE SET 
        description = 'Gerente',
        permissions = '{"management": true}'
      RETURNING id
    `);
    
    console.log('Roles insertados exitosamente');
    
    // 2. Inicializar credenciales bancarias del sistema
    console.log('Inicializando credenciales bancarias del sistema...');
    
    // Usar el script de setup de Baneco que ya maneja la eliminación de credenciales existentes
    const { setupBanecoCredentials } = await import('./setup-bankeco-credentials');
    const { testCredential, prodCredential } = await setupBanecoCredentials();
    
    console.log('Credenciales bancarias configuradas exitosamente');
    
    // 3. Crear usuario administrador
    console.log('Creando usuario administrador...');
    
    const adminData = {
      email: 'admin@pagui.com',
      password: 'admin123',
      fullName: 'Administrador del Sistema',
      phone: '76543210',
      address: 'La Paz, Bolivia',
      roleId: superAdminRole.rows[0].id
    };
    
    const admin = await userService.createUser(adminData);
    console.log(`Usuario administrador creado con ID: ${admin.id}`);
    
    // 4. Crear usuario de ejemplo
    console.log('Creando usuario de ejemplo...');
    
    const userData = {
      email: 'usuario@example.com',
      password: 'usuario123',
      fullName: 'Usuario Demo',
      phone: '65432109',
      address: 'Santa Cruz, Bolivia',
      roleId: userRole.rows[0].id
    };
    
    const user = await userService.createUser(userData);
    console.log(`Usuario creado con ID: ${user.id}`);
    
    // 5. Crear usuario gerente
    console.log('Creando usuario gerente...');
    
    const managerData = {
      email: 'gerente@example.com',
      password: 'gerente123',
      fullName: 'Gerente Demo',
      phone: '55555555',
      address: 'Cochabamba, Bolivia',
      roleId: managerRole.rows[0].id
    };
    
    const manager = await userService.createUser(managerData);
    console.log(`Gerente creado con ID: ${manager.id}`);
    
    // 6. Crear cuentas bancarias para los usuarios
    console.log('Creando cuentas bancarias...');
    
    // Cuenta para el administrador
    const adminAccount = await query(`
      INSERT INTO accounts (account_number, account_type, currency, balance, available_balance, third_bank_credential_id)
      VALUES ($1, 'business', 'BOB', 10000.00, 10000.00, $2)
      RETURNING id
    `, ['ADM001', prodCredential.id]);
    
    // Cuenta para el usuario
    const userAccount = await query(`
      INSERT INTO accounts (account_number, account_type, currency, balance, available_balance, third_bank_credential_id)
      VALUES ($1, 'current', 'BOB', 5000.00, 5000.00, $2)
      RETURNING id
    `, ['USR001', testCredential.id]);
    
    // Cuenta para el gerente
    const managerAccount = await query(`
      INSERT INTO accounts (account_number, account_type, currency, balance, available_balance, third_bank_credential_id)
      VALUES ($1, 'business', 'BOB', 7500.00, 7500.00, $2)
      RETURNING id
    `, ['MGR001', prodCredential.id]);
    
    console.log('Cuentas bancarias creadas exitosamente');
    
    // 7. Crear relaciones usuario-cuenta
    console.log('Creando relaciones usuario-cuenta...');
    
    await query(`
      INSERT INTO user_accounts (user_id, account_id, role, is_primary)
      VALUES ($1, $2, 'owner', true)
    `, [admin.id, adminAccount.rows[0].id]);
    
    await query(`
      INSERT INTO user_accounts (user_id, account_id, role, is_primary)
      VALUES ($1, $2, 'owner', true)
    `, [user.id, userAccount.rows[0].id]);
    
    await query(`
      INSERT INTO user_accounts (user_id, account_id, role, is_primary)
      VALUES ($1, $2, 'owner', true)
    `, [manager.id, managerAccount.rows[0].id]);
    
    console.log('Relaciones usuario-cuenta creadas exitosamente');
    
    // 8. Crear API key para el usuario
    console.log('Creando API key...');
    
    const apiKey = generateApiKey();
    
    await query(`
      INSERT INTO api_keys (api_key, user_id, description, status)
      VALUES ($1, $2, 'API Key de demostración', 'active')
      ON CONFLICT (api_key) DO NOTHING
    `, [apiKey, user.id]);
    
    console.log(`API key generada: ${apiKey}`);
    
    // 9. Crear tokens de autenticación de ejemplo
    console.log('Creando tokens de autenticación...');
    
    const tokens = [
      {
        userId: admin.id,
        token: generateApiKey(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      },
      {
        userId: user.id,
        token: generateApiKey(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      }
    ];
    
    for (const tokenData of tokens) {
      await query(`
        INSERT INTO auth_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (token) DO NOTHING
      `, [tokenData.userId, tokenData.token, tokenData.expiresAt.toISOString()]);
    }
    
    console.log('Tokens de autenticación creados exitosamente');
    
    console.log('✅ Seed de la base de datos completado exitosamente');
    
    // Resumen de lo creado
    console.log('\n📊 Resumen del seed:');
    console.log(`- Roles: 3 (admin, user, manager)`);
    console.log(`- Usuarios: 3 (Administrador, Usuario, Gerente)`);
    console.log(`- Cuentas bancarias: 3`);
    console.log(`- Relaciones usuario-cuenta: 3`);
    console.log(`- Credenciales bancarias: 2 (Test + Producción)`);
    console.log(`- API Keys: 1`);
    console.log(`- Tokens de autenticación: 2`);
    
    // Mostrar información de las credenciales bancarias
    console.log('\n🏦 Credenciales Bancarias:');
    console.log(`- Test (ID: ${testCredential.id}): ${testCredential.accountNumber} - ${testCredential.username}`);
    console.log(`- Producción (ID: ${prodCredential.id}): ${prodCredential.accountNumber} - ${prodCredential.username}`);
    
    // Mostrar información de las cuentas
    console.log('\n💰 Cuentas Bancarias:');
    console.log(`- Administrador: ${adminAccount.rows[0].id} (ADM001) - BOB 10,000.00`);
    console.log(`- Usuario: ${userAccount.rows[0].id} (USR001) - BOB 5,000.00`);
    console.log(`- Gerente: ${managerAccount.rows[0].id} (MGR001) - BOB 7,500.00`);
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

// Función para generar API keys aleatorias
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Ejecutar seed si se llama directamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en seed:', error);
      process.exit(1);
    });
}