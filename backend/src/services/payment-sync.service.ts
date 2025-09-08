import { pool, query } from '../config/database';
import bankService from './bank.service';
import qrService from './qr.service';

export interface PaymentSyncJob {
  id: number;
  qrId: string;
  accountId: number;
  lastChecked: Date;
  nextCheck: Date;
  checkCount: number;
  maxChecks: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'high' | 'medium' | 'low';
}

export interface PaymentSyncConfig {
  // Intervalos de verificación (en minutos)
  intervals: {
    pending: number;    // Pagos pendientes: cada 2 minutos
    processing: number; // Pagos en proceso: cada 5 minutos
    active: number;     // QRs activos: cada 15 minutos
  };
  // Límites de verificación
  limits: {
    maxChecksPerQR: number;     // Máximo 20 verificaciones por QR
    maxAgeHours: number;        // Máximo 24 horas de verificación
    batchSize: number;          // Procesar 50 QRs por lote
  };
}

class PaymentSyncService {
  private config: PaymentSyncConfig = {
    intervals: {
      pending: 2,    // 2 minutos para pagos pendientes
      processing: 5, // 5 minutos para pagos en proceso
      active: 15     // 15 minutos para QRs activos
    },
    limits: {
      maxChecksPerQR: 20,
      maxAgeHours: 24,
      batchSize: 50
    }
  };

  /**
   * Obtener QRs que necesitan verificación de estado
   */
  async getQRsToSync(): Promise<PaymentSyncJob[]> {
    const now = new Date();
    const maxAge = new Date(now.getTime() - (this.config.limits.maxAgeHours * 60 * 60 * 1000));

    const result = await query(`
      SELECT 
        q.id as qr_id,
        q.account_id,
        q.status,
        q.created_at,
        COALESCE(ps.last_checked, q.created_at) as last_checked,
        COALESCE(ps.check_count, 0) as check_count,
        COALESCE(ps.next_check, q.created_at + INTERVAL '2 minutes') as next_check
      FROM qr_codes q
      LEFT JOIN payment_sync_status ps ON q.id = ps.qr_id
      WHERE q.status IN ('active', 'pending')
        AND q.created_at > $1
        AND (ps.check_count IS NULL OR ps.check_count < $2)
        AND (ps.next_check IS NULL OR ps.next_check <= $3)
        AND (ps.final_status IS NULL) -- Excluir QRs con estado final
        AND q.deleted_at IS NULL
      ORDER BY 
        CASE 
          WHEN q.status = 'pending' THEN 1
          WHEN q.status = 'processing' THEN 2
          ELSE 3
        END,
        q.created_at ASC
      LIMIT $4
    `, [maxAge, this.config.limits.maxChecksPerQR, now, this.config.limits.batchSize]);

    return result.rows.map(row => ({
      id: 0, // Se asignará al crear el job
      qrId: row.qr_id,
      accountId: row.account_id,
      lastChecked: row.last_checked,
      nextCheck: row.next_check,
      checkCount: row.check_count,
      maxChecks: this.config.limits.maxChecksPerQR,
      status: 'pending' as const,
      priority: this.getPriority(row.status, row.check_count)
    }));
  }

  /**
   * Determinar prioridad basada en estado y número de verificaciones
   */
  private getPriority(qrStatus: string, checkCount: number): 'high' | 'medium' | 'low' {
    if (qrStatus === 'pending' && checkCount < 5) return 'high';
    if (qrStatus === 'processing' && checkCount < 10) return 'medium';
    return 'low';
  }

  /**
   * Sincronizar estado de un QR específico
   */
  async syncQRStatus(qrId: string, accountId: number): Promise<boolean> {
    try {
      console.log(`🔄 Sincronizando estado del QR: ${qrId}`);

      // Obtener información del QR
      const qrDetails = await qrService.getByQrId(qrId);
      if (!qrDetails) {
        console.log(`❌ QR no encontrado: ${qrId}`);
        return false;
      }

      // Verificar si el QR ya está expirado
      if (this.isQRExpired(qrDetails)) {
        console.log(`⏰ QR expirado, no sincronizando: ${qrId}`);
        await this.updateSyncStatus(qrId, true, 'expired');
        return true; // No es un error, simplemente no necesita sincronización
      }

      // Verificar si ya hay pagos registrados para este QR
      const existingPayments = await this.getExistingPayments(qrId);
      if (existingPayments.length > 0) {
        console.log(`💰 Pagos ya registrados para QR: ${qrId} (${existingPayments.length} pagos)`);
        
        // Si es QR de uso único y ya tiene pagos, no sincronizar más
        if (qrDetails.singleUse) {
          console.log(`🔒 QR de uso único ya pagado, no sincronizando más: ${qrId}`);
          await this.updateSyncStatus(qrId, true, 'completed');
          return true;
        }
      }

      // Verificar estado con el banco
      console.log(`🏦 Consultando estado con banco para QR: ${qrId}`);
      const bankStatus = await bankService.checkQRStatus(qrId, accountId);
      if (!bankStatus) {
        console.log(`❌ Error verificando estado con banco: ${qrId}`);
        return false;
      }

      console.log(`📊 Estado del banco para QR ${qrId}: ${bankStatus.status}`);

      // Comparar estados y actualizar si es necesario
      const needsUpdate = await this.compareAndUpdateStatus(qrDetails, bankStatus);
      
      if (needsUpdate) {
        console.log(`✅ Estado actualizado para QR: ${qrId} -> ${bankStatus.status}`);
      } else {
        console.log(`ℹ️ Estado sin cambios para QR: ${qrId}`);
      }

      // Actualizar registro de sincronización
      await this.updateSyncStatus(qrId, true);
      
      return true;
    } catch (error) {
      console.error(`❌ Error sincronizando QR ${qrId}:`, error);
      await this.updateSyncStatus(qrId, false);
      return false;
    }
  }

  /**
   * Comparar estados y actualizar si es necesario
   */
  private async compareAndUpdateStatus(qrDetails: any, bankStatus: any): Promise<boolean> {
    if (qrDetails.status === bankStatus.status) {
      return false; // No hay cambios
    }

    // Actualizar estado en la base de datos
    await query(`
      UPDATE qr_codes 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [bankStatus.status, qrDetails.id]);

    // Si el pago fue completado, crear movimiento de cuenta
    if (bankStatus.status === 'completed' && qrDetails.status !== 'completed') {
      await this.createAccountMovement(qrDetails, bankStatus);
    }

    return true;
  }

  /**
   * Crear movimiento de cuenta cuando se completa un pago
   */
  private async createAccountMovement(qrDetails: any, bankStatus: any): Promise<void> {
    try {
      await query(`
        INSERT INTO account_movements (
          account_id, movement_type, amount, description, 
          reference_id, reference_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        qrDetails.accountId,
        'qr_payment',
        bankStatus.amount,
        `Pago QR completado - ${qrDetails.description || 'Sin descripción'}`,
        qrDetails.id,
        'qr_code'
      ]);

      // Actualizar balance de la cuenta
      await query(`
        UPDATE accounts 
        SET balance = balance + $1, 
            available_balance = available_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [bankStatus.amount, qrDetails.accountId]);

      console.log(`💰 Movimiento creado para cuenta ${qrDetails.accountId}: +${bankStatus.amount}`);
    } catch (error) {
      console.error('Error creando movimiento de cuenta:', error);
    }
  }

  /**
   * Actualizar estado de sincronización
   */
  private async updateSyncStatus(qrId: string, success: boolean, finalStatus?: string): Promise<void> {
    let nextCheck: Date | null = null;
    
    // Si es un estado final (completed, expired), no programar más verificaciones
    if (finalStatus && ['completed', 'expired'].includes(finalStatus)) {
      nextCheck = null;
      console.log(`🏁 Estado final alcanzado para QR ${qrId}: ${finalStatus}`);
    } else {
      nextCheck = this.calculateNextCheck(success);
    }
    
    await query(`
      INSERT INTO payment_sync_status (qr_id, last_checked, next_check, check_count, success, final_status)
      VALUES ($1, CURRENT_TIMESTAMP, $2, 1, $3, $4)
      ON CONFLICT (qr_id) 
      DO UPDATE SET 
        last_checked = CURRENT_TIMESTAMP,
        next_check = $2,
        check_count = payment_sync_status.check_count + 1,
        success = $3,
        final_status = COALESCE($4, payment_sync_status.final_status)
    `, [qrId, nextCheck, success, finalStatus]);
  }

  /**
   * Calcular próxima verificación basada en éxito y estado
   */
  private calculateNextCheck(success: boolean): Date {
    const now = new Date();
    const intervalMinutes = success ? this.config.intervals.active : this.config.intervals.pending;
    return new Date(now.getTime() + (intervalMinutes * 60 * 1000));
  }

  /**
   * Procesar lote de sincronizaciones
   */
  async processSyncBatch(): Promise<{ processed: number; successful: number; failed: number }> {
    console.log('🚀 Iniciando lote de sincronización de pagos...');
    
    const qrsToSync = await this.getQRsToSync();
    console.log(`📋 QRs a sincronizar: ${qrsToSync.length}`);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const job of qrsToSync) {
      try {
        const success = await this.syncQRStatus(job.qrId, job.accountId);
        if (success) {
          successful++;
        } else {
          failed++;
        }
        processed++;

        // Pequeña pausa para no sobrecargar el banco
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error procesando QR ${job.qrId}:`, error);
        failed++;
        processed++;
      }
    }

    console.log(`✅ Lote completado: ${processed} procesados, ${successful} exitosos, ${failed} fallidos`);
    
    return { processed, successful, failed };
  }

  /**
   * Limpiar registros antiguos de sincronización
   */
  async cleanupOldSyncRecords(): Promise<void> {
    const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 días
    
    await query(`
      DELETE FROM payment_sync_status 
      WHERE last_checked < $1
    `, [cutoffDate]);

    console.log('🧹 Registros antiguos de sincronización limpiados');
  }

  /**
   * Verificar si un QR está expirado
   */
  private isQRExpired(qrDetails: any): boolean {
    if (!qrDetails.dueDate) return false;
    
    const now = new Date();
    const dueDate = new Date(qrDetails.dueDate);
    
    return now > dueDate;
  }

  /**
   * Obtener pagos existentes para un QR
   */
  private async getExistingPayments(qrId: string): Promise<any[]> {
    try {
      const result = await query(`
        SELECT id, amount, created_at
        FROM account_movements 
        WHERE reference_id = $1 
          AND movement_type = 'qr_payment'
          AND deleted_at IS NULL
        ORDER BY created_at DESC
      `, [qrId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error obteniendo pagos existentes:', error);
      return [];
    }
  }
}

export default new PaymentSyncService();
