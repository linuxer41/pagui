import { query } from '../config/database';
import { userService } from '../services/user.service';

export async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');
    
    // 0. Ejecutar migraciones necesarias
    console.log('🔄 Ejecutando migraciones...');
    const { migrateAddApiBaseUrl } = await import('./migrate-add-api-base-url');
    await migrateAddApiBaseUrl();
    
    // 1. Insertar roles predefinidos
    console.log('Insertando roles predefinidos...');
    
    const superAdminRole = await query(`
      INSERT INTO roles (name, description, permissions, is_system_role)
      VALUES ('SUPER_ADMIN', 'Acceso total al sistema', '{"*": true}', true)
      ON CONFLICT (name) DO UPDATE SET 
        description = 'Acceso total al sistema',
        permissions = '{"*": true}'
      RETURNING id
    `);
    
    const companyAdminRole = await query(`
      INSERT INTO roles (name, description, permissions, is_system_role)
      VALUES ('COMPANY_ADMIN', 'Administrador de empresa', '{"users": {"create": true, "read": true, "update": true}, "qr_codes": {"create": true, "read": true, "update": true}, "transactions": {"read": true}, "reports": {"read": true}, "third_bank_credentials": {"read": true, "update": true}}', true)
      ON CONFLICT (name) DO UPDATE SET 
        description = 'Administrador de empresa',
        permissions = '{"users": {"create": true, "read": true, "update": true}, "qr_codes": {"create": true, "read": true, "update": true}, "transactions": {"read": true}, "reports": {"read": true}, "third_bank_credentials": {"read": true, "update": true}}'
      RETURNING id
    `);
    
    const employeeRole = await query(`
      INSERT INTO roles (name, description, permissions, is_system_role)
      VALUES ('EMPLOYEE', 'Empleado con acceso limitado', '{"qr_codes": {"read": true}, "transactions": {"read": true}}', true)
      ON CONFLICT (name) DO UPDATE SET 
        description = 'Empleado con acceso limitado',
        permissions = '{"qr_codes": {"read": true}, "transactions": {"read": true}}'
      RETURNING id
    `);
    
    console.log('Roles insertados exitosamente');
    
    // 2. Inicializar credenciales bancarias del sistema
    console.log('Inicializando credenciales bancarias del sistema...');
    
    // Usar el script de setup de Baneco que ya maneja la eliminación de credenciales existentes
    const { setupBanecoCredentials } = await import('./setup-bankeco-credentials');
    const { testCredential, prodCredential } = await setupBanecoCredentials();
    
    console.log('Credenciales bancarias configuradas exitosamente');
    
    // 3. Crear usuario SUPER_ADMIN
    console.log('Creando usuario SUPER_ADMIN...');
    
    const superAdminData = {
      email: 'admin@pagui.com',
      password: 'admin123',
      fullName: 'Administrador del Sistema',
      entityType: 'individual' as const,
      identificationType: 'CI',
      identificationNumber: '12345678',
      phoneNumber: '76543210',
      phoneExtension: '123',
      roleId: superAdminRole.rows[0].id,
      isPrimaryUser: true,
      bankCredentialId: prodCredential.id // Usar credenciales de producción por defecto
    };
    
    const superAdmin = await userService.createUser(superAdminData);
    console.log(`Usuario SUPER_ADMIN creado con ID: ${superAdmin.id}`);
    
    // 4. Crear empresa de ejemplo
    console.log('Creando empresa de ejemplo...');
    
    const companyData = {
      email: 'empresa@example.com',
      password: 'empresa123',
      fullName: 'Empresa Demo S.A.',
      businessId: 'EMP001',
      entityType: 'company' as const,
      identificationType: 'CI',
      identificationNumber: '87654321',
      phoneNumber: '65432109',
      phoneExtension: '456',
      address: 'Av. Principal #123, La Paz',
      roleId: companyAdminRole.rows[0].id,
      isPrimaryUser: true,
      bankCredentialId: prodCredential.id // Usar credenciales de producción por defecto
    };
    
    const company = await userService.createUser(companyData);
    console.log(`Empresa creada con ID: ${company.id}`);
    
    // 5. Crear empleado de ejemplo
    console.log('Creando empleado de ejemplo...');
    
    const employeeData = {
      email: 'empleado@example.com',
      password: 'empleado123',
      fullName: 'Empleado Demo',
      entityType: 'individual' as const,
      identificationType: 'CI',
      identificationNumber: '11111111',
      phoneNumber: '55555555',
      phoneExtension: '789',
      roleId: employeeRole.rows[0].id,
      isPrimaryUser: false,
      parentUserId: company.id,
      bankCredentialId: testCredential.id // Usar credenciales de prueba por defecto
    };
    
    const employee = await userService.createUser(employeeData);
    console.log(`Empleado creado con ID: ${employee.id}`);
    
    // 6. Crear API key para la empresa
    console.log('Creando API key...');
    
    const apiKey = generateApiKey();
    const permissions = {
      qr_codes: { create: true, read: true },
      transactions: { read: true }
    };
    
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    
    await query(`
      INSERT INTO api_keys (api_key, description, user_id, created_by_user_id, permissions, expires_at, status)
      VALUES ($1, 'API Key de demostración', $2, $3, $4, $5, 'active')
      ON CONFLICT (api_key) DO NOTHING
    `, [apiKey, company.id, company.id, JSON.stringify(permissions), expiresAt.toISOString()]);
    
    console.log(`API key generada: ${apiKey}`);
    
    // 7. Crear tokens de autenticación de ejemplo
    console.log('Creando tokens de autenticación...');
    
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
      }
    ];
    
    for (const device of deviceInfos) {
      await query(`
        INSERT INTO auth_tokens (
          user_id, token_type, token, expires_at, ip_address, user_agent
        ) VALUES ($1, 'REFRESH_TOKEN', $2, $3, $4, $5)
        ON CONFLICT (token) DO NOTHING
      `, [
        company.id,
        generateApiKey(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
        device.ip,
        device.userAgent
      ]);
    }
    
    console.log('✅ Seed de la base de datos completado exitosamente');
    
    // Resumen de lo creado
    console.log('\n📊 Resumen del seed:');
    console.log(`- Roles: ${(superAdminRole.rowCount || 0) + (companyAdminRole.rowCount || 0) + (employeeRole.rowCount || 0)}`);
    console.log(`- Usuarios: 3 (SUPER_ADMIN, Empresa, Empleado)`);
    console.log(`- Credenciales bancarias: 2 (Test + Producción)`);
    console.log(`- API Keys: 1`);
    console.log(`- Tokens de autenticación: 2`);
    
    // Mostrar información de las credenciales bancarias
    console.log('\n🏦 Credenciales Bancarias:');
    console.log(`- Test (ID: ${testCredential.id}): ${testCredential.accountNumber} - ${testCredential.username}`);
    console.log(`- Producción (ID: ${prodCredential.id}): ${prodCredential.accountNumber} - ${prodCredential.username}`);
    
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