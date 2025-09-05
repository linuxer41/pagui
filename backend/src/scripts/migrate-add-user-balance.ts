import { pool, query } from '../config/database';

async function migrateAddUserBalance() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración para agregar campo balance a usuarios...');
    
    await client.query('BEGIN');
    
    // 1. Agregar campo balance a la tabla users
    console.log('📝 Agregando campo balance a tabla users...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00
    `);
    
    // 2. Crear función para calcular balance
    console.log('🔧 Creando función para calcular balance...');
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_user_balance(user_id_param INTEGER)
      RETURNS DECIMAL(15, 2) AS $$
      DECLARE
        total_balance DECIMAL(15, 2) := 0.00;
      BEGIN
        -- Sumar transacciones entrantes (pagos recibidos)
        SELECT COALESCE(SUM(amount), 0.00) INTO total_balance
        FROM transactions 
        WHERE user_id = user_id_param 
          AND type = 'incoming' 
          AND status = 'completed'
          AND deleted_at IS NULL;
        
        -- Restar transacciones salientes (pagos enviados)
        SELECT total_balance - COALESCE(SUM(amount), 0.00) INTO total_balance
        FROM transactions 
        WHERE user_id = user_id_param 
          AND type = 'outgoing' 
          AND status = 'completed'
          AND deleted_at IS NULL;
        
        RETURN total_balance;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 3. Crear función para actualizar balance automáticamente
    console.log('🔧 Creando función para actualizar balance automáticamente...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_user_balance()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Actualizar balance del usuario cuando se inserta/actualiza/elimina una transacción
        IF TG_OP = 'INSERT' THEN
          UPDATE users 
          SET balance = calculate_user_balance(NEW.user_id),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.user_id;
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          -- Si cambió el user_id, actualizar ambos usuarios
          IF OLD.user_id != NEW.user_id THEN
            UPDATE users 
            SET balance = calculate_user_balance(OLD.user_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.user_id;
          END IF;
          UPDATE users 
          SET balance = calculate_user_balance(NEW.user_id),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.user_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE users 
          SET balance = calculate_user_balance(OLD.user_id),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = OLD.user_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 4. Crear trigger para transacciones
    console.log('🔧 Creando trigger para transacciones...');
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_user_balance ON transactions;
      
      CREATE TRIGGER trigger_update_user_balance
      AFTER INSERT OR UPDATE OR DELETE ON transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_user_balance();
    `);
    
    // 5. Crear función para actualizar balance de todos los usuarios existentes
    console.log('🔧 Creando función para actualizar balance de usuarios existentes...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_all_users_balance()
      RETURNS VOID AS $$
      DECLARE
        user_record RECORD;
      BEGIN
        FOR user_record IN SELECT id FROM users WHERE deleted_at IS NULL LOOP
          UPDATE users 
          SET balance = calculate_user_balance(user_record.id),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = user_record.id;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 6. Ejecutar actualización de balance para usuarios existentes
    console.log('🔄 Actualizando balance de usuarios existentes...');
    await client.query('SELECT update_all_users_balance()');
    
    // 7. Crear índices para optimizar consultas de balance
    console.log('🔧 Creando índices para optimizar consultas...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_type_status 
      ON transactions(user_id, type, status) 
      WHERE deleted_at IS NULL;
      
      CREATE INDEX IF NOT EXISTS idx_users_balance 
      ON users(balance) 
      WHERE deleted_at IS NULL;
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente!');
    
    // Mostrar estadísticas
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(balance) as total_balance,
        AVG(balance) as avg_balance,
        MIN(balance) as min_balance,
        MAX(balance) as max_balance
      FROM users 
      WHERE deleted_at IS NULL
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 Estadísticas de balance:');
    console.log(`   Total usuarios: ${stats.total_users}`);
    console.log(`   Balance total: Bs. ${stats.total_balance || 0}`);
    console.log(`   Balance promedio: Bs. ${stats.avg_balance || 0}`);
    console.log(`   Balance mínimo: Bs. ${stats.min_balance || 0}`);
    console.log(`   Balance máximo: Bs. ${stats.max_balance || 0}`);
    
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
  migrateAddUserBalance()
    .then(() => {
      console.log('🎉 Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export { migrateAddUserBalance };
