import { query, pool } from '../config/database';

/**
 * Script para migrar datos de la tabla qr_payments a la nueva tabla transactions
 * Este script debe ejecutarse después de crear la nueva estructura de la base de datos
 */
async function migrateTransactions() {
  console.log('🔄 Iniciando migración de qr_payments a transactions...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verificar si existen registros en la tabla qr_payments
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_payments'
      ) as exists
    `);
    
    if (!checkResult.rows[0].exists) {
      console.log('⚠️ La tabla qr_payments no existe. No hay datos para migrar.');
      await client.query('COMMIT');
      return;
    }
    
    // Contar registros en la tabla qr_payments
    const countResult = await client.query('SELECT COUNT(*) as count FROM qr_payments');
    const count = parseInt(countResult.rows[0].count);
    
    console.log(`📊 Encontrados ${count} registros en qr_payments para migrar.`);
    
    if (count === 0) {
      console.log('⚠️ No hay registros en qr_payments para migrar.');
      await client.query('COMMIT');
      return;
    }
    
    // Migrar datos de qr_payments a transactions
    const result = await client.query(`
      INSERT INTO transactions (
        qr_id,
        company_id,
        bank_id,
        transaction_id,
        payment_date,
        payment_time,
        currency,
        amount,
        type,
        sender_name,
        sender_document_id,
        sender_account,
        description,
        metadata,
        status,
        created_at,
        updated_at
      )
      SELECT 
        qr_id,
        company_id,
        bank_id,
        transaction_id,
        payment_date,
        payment_time,
        currency,
        amount,
        'incoming' as type, -- Todos los pagos de QR son de tipo incoming
        sender_name,
        sender_document_id,
        sender_account,
        description,
        jsonb_build_object(
          'sender_bank_code', sender_bank_code,
          'branch_code', branch_code
        ) as metadata,
        'completed' as status,
        created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM qr_payments
      WHERE deleted_at IS NULL
      RETURNING id
    `);
    
    console.log(`✅ Migrados ${result.rowCount} registros a la tabla transactions.`);
    
    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar la migración si este script se ejecuta directamente
if (require.main === module) {
  migrateTransactions()
    .then(() => {
      console.log('🎉 Proceso de migración finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso de migración:', error);
      process.exit(1);
    });
}

export default migrateTransactions; 