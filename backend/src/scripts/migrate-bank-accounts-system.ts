import { pool, query } from '../config/database';

async function migrateBankAccountsSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🏦 Iniciando migración para sistema bancario profesional...');
    
    await client.query('BEGIN');
    
    // 1. Crear tabla de cuentas bancarias
    console.log('📝 Creando tabla de cuentas bancarias...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('current', 'savings', 'business', 'investment')),
        currency VARCHAR(3) NOT NULL DEFAULT 'BOB' CHECK (char_length(currency) = 3),
        balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed', 'blocked')),
        third_bank_credential_id INTEGER REFERENCES third_bank_credentials(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Crear tabla de relación usuarios-cuentas (muchos a muchos)
    console.log('🔗 Creando tabla de relación usuarios-cuentas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'co-owner', 'authorized', 'viewer')),
        permissions JSONB NOT NULL DEFAULT '{"view": true, "transfer": false, "withdraw": false, "manage": false}',
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, account_id)
      );
    `);
    
    // 3. Crear tabla de movimientos de cuenta
    console.log('💳 Creando tabla de movimientos de cuenta...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_movements (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'adjustment')),
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
        balance_before DECIMAL(15, 2) NOT NULL,
        balance_after DECIMAL(15, 2) NOT NULL,
        description TEXT,
        reference_id VARCHAR(100), -- ID de transacción externa o QR
        reference_type VARCHAR(50), -- 'qr_payment', 'bank_transfer', 'manual', etc.
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    
    // 4. Crear función para calcular balance de cuenta
    console.log('🔧 Creando función para calcular balance de cuenta...');
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_account_balance(account_id_param INTEGER)
      RETURNS DECIMAL(15, 2) AS $$
      DECLARE
        total_balance DECIMAL(15, 2) := 0.00;
      BEGIN
        -- Sumar todos los movimientos de la cuenta
        SELECT COALESCE(SUM(
          CASE 
            WHEN movement_type IN ('deposit', 'transfer_in', 'interest') THEN amount
            WHEN movement_type IN ('withdrawal', 'transfer_out', 'fee') THEN -amount
            ELSE 0
          END
        ), 0.00) INTO total_balance
        FROM account_movements 
        WHERE account_id = account_id_param;
        
        RETURN total_balance;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 5. Crear función para actualizar balance automáticamente
    console.log('🔧 Creando función para actualizar balance automáticamente...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_account_balance()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Actualizar balance de la cuenta cuando se inserta/actualiza/elimina un movimiento
        IF TG_OP = 'INSERT' THEN
          UPDATE accounts 
          SET 
            balance = calculate_account_balance(NEW.account_id),
            available_balance = calculate_account_balance(NEW.account_id),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.account_id;
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          -- Si cambió el account_id, actualizar ambas cuentas
          IF OLD.account_id != NEW.account_id THEN
            UPDATE accounts 
            SET 
              balance = calculate_account_balance(OLD.account_id),
              available_balance = calculate_account_balance(OLD.account_id),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.account_id;
          END IF;
          UPDATE accounts 
          SET 
            balance = calculate_account_balance(NEW.account_id),
            available_balance = calculate_account_balance(NEW.account_id),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.account_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE accounts 
          SET 
            balance = calculate_account_balance(OLD.account_id),
            available_balance = calculate_account_balance(OLD.account_id),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = OLD.account_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 6. Crear trigger para movimientos de cuenta
    console.log('🔧 Creando trigger para movimientos de cuenta...');
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_account_balance ON account_movements;
      
      CREATE TRIGGER trigger_update_account_balance
      AFTER INSERT OR UPDATE OR DELETE ON account_movements
      FOR EACH ROW
      EXECUTE FUNCTION update_account_balance();
    `);
    
    // 7. Crear función para crear movimiento de cuenta
    console.log('🔧 Creando función para crear movimiento de cuenta...');
    await client.query(`
      CREATE OR REPLACE FUNCTION create_account_movement(
        p_account_id INTEGER,
        p_movement_type VARCHAR(20),
        p_amount DECIMAL(15, 2),
        p_description TEXT DEFAULT NULL,
        p_reference_id VARCHAR(100) DEFAULT NULL,
        p_reference_type VARCHAR(50) DEFAULT NULL,
        p_metadata JSONB DEFAULT '{}',
        p_created_by_user_id INTEGER DEFAULT NULL
      )
      RETURNS INTEGER AS $$
      DECLARE
        v_balance_before DECIMAL(15, 2);
        v_balance_after DECIMAL(15, 2);
        v_movement_id INTEGER;
      BEGIN
        -- Obtener balance actual
        SELECT balance INTO v_balance_before
        FROM accounts 
        WHERE id = p_account_id;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Cuenta no encontrada';
        END IF;
        
        -- Calcular nuevo balance
        IF p_movement_type IN ('deposit', 'transfer_in', 'interest') THEN
          v_balance_after := v_balance_before + p_amount;
        ELSIF p_movement_type IN ('withdrawal', 'transfer_out', 'fee') THEN
          v_balance_after := v_balance_before - p_amount;
        ELSE
          v_balance_after := v_balance_before;
        END IF;
        
        -- Insertar movimiento
        INSERT INTO account_movements (
          account_id, movement_type, amount, balance_before, balance_after,
          description, reference_id, reference_type, metadata, created_by_user_id
        ) VALUES (
          p_account_id, p_movement_type, p_amount, v_balance_before, v_balance_after,
          p_description, p_reference_id, p_reference_type, p_metadata, p_created_by_user_id
        ) RETURNING id INTO v_movement_id;
        
        RETURN v_movement_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 8. Crear índices para optimizar consultas
    console.log('🔧 Creando índices para optimizar consultas...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);
      CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
      CREATE INDEX IF NOT EXISTS idx_user_accounts_user ON user_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_accounts_account ON user_accounts(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_movements_account ON account_movements(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_movements_type ON account_movements(movement_type);
      CREATE INDEX IF NOT EXISTS idx_account_movements_date ON account_movements(created_at);
    `);
    
    // 9. Crear cuenta por defecto para usuarios existentes
    console.log('🔄 Creando cuentas por defecto para usuarios existentes...');
    await client.query(`
      INSERT INTO accounts (account_number, account_type, currency, balance, available_balance, status)
      SELECT 
        'ACC-' || LPAD(u.id::text, 6, '0') as account_number,
        'current' as account_type,
        'BOB' as currency,
        0.00 as balance,
        0.00 as available_balance,
        'active' as status
      FROM users u
      ON CONFLICT (account_number) DO NOTHING;
    `);
    
    // 10. Vincular usuarios existentes con sus cuentas por defecto
    console.log('🔗 Vinculando usuarios con cuentas por defecto...');
    await client.query(`
      INSERT INTO user_accounts (user_id, account_id, role, permissions, is_primary)
      SELECT 
        u.id as user_id,
        a.id as account_id,
        'owner' as role,
        '{"view": true, "transfer": true, "withdraw": true, "manage": true}'::jsonb as permissions,
        TRUE as is_primary
      FROM users u
      INNER JOIN accounts a ON a.account_number = 'ACC-' || LPAD(u.id::text, 6, '0')
      ON CONFLICT (user_id, account_id) DO NOTHING;
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migración del sistema bancario completada exitosamente!');
    
    // Mostrar estadísticas
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM accounts) as total_accounts,
        (SELECT COUNT(*) FROM user_accounts) as total_user_accounts,
        (SELECT COUNT(*) FROM account_movements) as total_movements,
        (SELECT SUM(balance) FROM accounts) as total_balance
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 Estadísticas del sistema bancario:');
    console.log(`   Total cuentas: ${stats.total_accounts}`);
    console.log(`   Total relaciones usuario-cuenta: ${stats.total_user_accounts}`);
    console.log(`   Total movimientos: ${stats.total_movements}`);
    console.log(`   Balance total del sistema: Bs. ${stats.total_balance || 0}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateBankAccountsSystem()
    .then(() => {
      console.log('🎉 Migración del sistema bancario finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export { migrateBankAccountsSystem };
