import { pool, query } from '../config/database';
import bcrypt from 'bcrypt';

async function seedSimple() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Iniciando seed del sistema simplificado...');
    
    await client.query('BEGIN');
    
    // 1. Crear usuarios de prueba
    console.log('👥 Creando usuarios de prueba...');
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);
    
    // Usuario administrador
    const adminResult = await client.query(`
      INSERT INTO users (email, password, full_name, phone, role_id, status)
      VALUES ('admin@pagui.com', $1, 'Administrador del Sistema', '+591 70000000', 1, 'active')
      RETURNING id
    `, [adminPassword]);
    
    const adminUserId = adminResult.rows[0].id;
    
    // Usuario estándar
    const userResult = await client.query(`
      INSERT INTO users (email, password, full_name, phone, role_id, status)
      VALUES ('usuario@pagui.com', $1, 'Usuario Test', '+591 70000001', 2, 'active')
      RETURNING id
    `, [userPassword]);
    
    const userId = userResult.rows[0].id;
    
    // 2. Obtener credenciales bancarias
    const bankCredResult = await client.query('SELECT id FROM third_bank_credentials LIMIT 1');
    const bankCredentialId = bankCredResult.rows[0].id;
    
    // 3. Crear cuentas bancarias
    console.log('🏦 Creando cuentas bancarias...');
    
    const adminAccountResult = await client.query(`
      INSERT INTO accounts (account_number, account_type, currency, balance, available_balance, status, third_bank_credential_id)
      VALUES ('ACC-001', 'current', 'BOB', 10000.00, 10000.00, 'active', $1)
      RETURNING id
    `, [bankCredentialId]);
    
    const adminAccountId = adminAccountResult.rows[0].id;
    
    const userAccountResult = await client.query(`
      INSERT INTO accounts (account_number, account_type, currency, balance, available_balance, status, third_bank_credential_id)
      VALUES ('ACC-002', 'savings', 'BOB', 5000.00, 5000.00, 'active', $1)
      RETURNING id
    `, [bankCredentialId]);
    
    const userAccountId = userAccountResult.rows[0].id;
    
    // 4. Vincular usuarios con cuentas
    console.log('🔗 Vinculando usuarios con cuentas...');
    
    await client.query(`
      INSERT INTO user_accounts (user_id, account_id, role, is_primary)
      VALUES 
        ($1, $2, 'owner', true),
        ($3, $4, 'owner', true)
    `, [adminUserId, adminAccountId, userId, userAccountId]);
    
    // 5. Crear movimientos iniciales
    console.log('💰 Creando movimientos iniciales...');
    
    await client.query(`
      INSERT INTO account_movements (account_id, movement_type, amount, balance_before, balance_after, description, reference_type)
      VALUES 
        ($1, 'deposit', 10000.00, 0.00, 10000.00, 'Depósito inicial', 'manual'),
        ($2, 'deposit', 5000.00, 0.00, 5000.00, 'Depósito inicial', 'manual')
    `, [adminAccountId, userAccountId]);
    
    // 6. Crear QR codes de prueba
    console.log('📱 Creando QR codes de prueba...');
    
    await client.query(`
      INSERT INTO qr_codes (qr_id, transaction_id, account_id, amount, description, due_date, status)
      VALUES 
        ('QR-001', 'TXN-001', $1, 100.00, 'QR de prueba 1', NOW() + INTERVAL '30 days', 'active'),
        ('QR-002', 'TXN-002', $2, 50.00, 'QR de prueba 2', NOW() + INTERVAL '30 days', 'active')
    `, [adminAccountId, userAccountId]);
    
    await client.query('COMMIT');
    console.log('✅ Seed del sistema simplificado completado!');
    
    // Mostrar estadísticas
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM accounts) as total_accounts,
        (SELECT COUNT(*) FROM user_accounts) as total_user_accounts,
        (SELECT COUNT(*) FROM account_movements) as total_movements,
        (SELECT COUNT(*) FROM qr_codes) as total_qr_codes,
        (SELECT SUM(balance) FROM accounts) as total_balance
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 Estadísticas del sistema:');
    console.log(`   Total usuarios: ${stats.total_users}`);
    console.log(`   Total cuentas: ${stats.total_accounts}`);
    console.log(`   Total relaciones usuario-cuenta: ${stats.total_user_accounts}`);
    console.log(`   Total movimientos: ${stats.total_movements}`);
    console.log(`   Total QR codes: ${stats.total_qr_codes}`);
    console.log(`   Balance total del sistema: Bs. ${stats.total_balance || 0}`);
    
    console.log('\n🔑 Credenciales de prueba:');
    console.log('   Admin: admin@pagui.com / admin123');
    console.log('   Usuario: usuario@pagui.com / user123');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en el seed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar seed si se llama directamente
if (require.main === module) {
  seedSimple()
    .then(() => {
      console.log('🎉 Seed del sistema simplificado finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en seed:', error);
      process.exit(1);
    });
}

export { seedSimple };
