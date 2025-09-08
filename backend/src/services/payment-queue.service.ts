import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import paymentSyncService from './payment-sync.service';

// Configuración de Redis
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null, // Requerido por BullMQ
  lazyConnect: true
};

// Tipos de trabajos
export interface PaymentSyncJobData {
  qrId: string;
  accountId: number;
  priority: 'high' | 'medium' | 'low';
  attempts?: number;
  delay?: number;
}

export interface PaymentCleanupJobData {
  olderThanDays: number;
}

class PaymentQueueService {
  private redis: Redis;
  private paymentSyncQueue: Queue<PaymentSyncJobData>;
  private paymentCleanupQueue: Queue<PaymentCleanupJobData>;
  private paymentSyncWorker: Worker<PaymentSyncJobData>;
  private paymentCleanupWorker: Worker<PaymentCleanupJobData>;
  private queueEvents: QueueEvents;

  constructor() {
    // Inicializar Redis
    this.redis = new Redis(redisConfig);
    
    // Crear colas
    this.paymentSyncQueue = new Queue<PaymentSyncJobData>('payment-sync', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100, // Mantener últimos 100 trabajos completados
        removeOnFail: 50,      // Mantener últimos 50 trabajos fallidos
        attempts: 3,           // 3 intentos por defecto
        backoff: {
          type: 'exponential',
          delay: 2000,         // 2 segundos iniciales
        },
      }
    });

    this.paymentCleanupQueue = new Queue<PaymentCleanupJobData>('payment-cleanup', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 2,
        delay: 24 * 60 * 60 * 1000, // 24 horas de delay
      }
    });

    // Crear workers
    this.paymentSyncWorker = new Worker<PaymentSyncJobData>(
      'payment-sync',
      this.processPaymentSyncJob.bind(this),
      {
        connection: redisConfig,
        concurrency: 5, // Procesar hasta 5 trabajos simultáneamente
      }
    );

    this.paymentCleanupWorker = new Worker<PaymentCleanupJobData>(
      'payment-cleanup',
      this.processPaymentCleanupJob.bind(this),
      {
        connection: redisConfig,
        concurrency: 1,
      }
    );

    // Eventos de cola para monitoreo
    this.queueEvents = new QueueEvents('payment-sync', { connection: redisConfig });
    this.setupEventListeners();
  }

  /**
   * Agregar trabajo de sincronización para un QR específico
   */
  async addPaymentSyncJob(data: PaymentSyncJobData): Promise<Job<PaymentSyncJobData>> {
    const jobOptions = {
      priority: this.getJobPriority(data.priority),
      delay: data.delay || 0,
      attempts: data.attempts || 3,
      jobId: `sync-${data.qrId}`, // ID único para evitar duplicados
    };

    console.log(`📋 Agregando trabajo de sincronización para QR: ${data.qrId}`);
    
    return await this.paymentSyncQueue.add('sync-payment', data, jobOptions);
  }

  /**
   * Agregar trabajo de limpieza programada
   */
  async addCleanupJob(data: PaymentCleanupJobData): Promise<Job<PaymentCleanupJobData>> {
    console.log(`🧹 Agregando trabajo de limpieza (${data.olderThanDays} días)`);
    
    return await this.paymentCleanupQueue.add('cleanup-old-records', data, {
      repeat: { pattern: '0 2 * * *' }, // Diario a las 2:00 AM
      jobId: 'daily-cleanup',
    });
  }

  /**
   * Procesar trabajo de sincronización de pago
   */
  private async processPaymentSyncJob(job: Job<PaymentSyncJobData>): Promise<void> {
    const { qrId, accountId } = job.data;
    
    console.log(`🔄 Procesando sincronización de QR: ${qrId} (intento ${job.attemptsMade + 1}/${job.opts.attempts})`);
    
    try {
      const success = await paymentSyncService.syncQRStatus(qrId, accountId);
      
      if (success) {
        console.log(`✅ Sincronización exitosa para QR: ${qrId}`);
        
        // Programar próxima verificación basada en el estado
        await this.scheduleNextSync(qrId, accountId);
      } else {
        throw new Error(`Falló la sincronización para QR: ${qrId}`);
      }
    } catch (error) {
      console.error(`❌ Error sincronizando QR ${qrId}:`, error);
      throw error; // Re-lanzar para que BullMQ maneje el reintento
    }
  }

  /**
   * Procesar trabajo de limpieza
   */
  private async processPaymentCleanupJob(job: Job<PaymentCleanupJobData>): Promise<void> {
    const { olderThanDays } = job.data;
    
    console.log(`🧹 Ejecutando limpieza de registros antiguos (${olderThanDays} días)`);
    
    try {
      await paymentSyncService.cleanupOldSyncRecords();
      console.log(`✅ Limpieza completada`);
    } catch (error) {
      console.error(`❌ Error en limpieza:`, error);
      throw error;
    }
  }

  /**
   * Programar próxima sincronización basada en el estado del QR
   */
  private async scheduleNextSync(qrId: string, accountId: number): Promise<void> {
    try {
      // Verificar si el QR ya tiene estado final
      const syncStatus = await this.getSyncStatus(qrId);
      if (syncStatus && syncStatus.final_status) {
        console.log(`🏁 QR ${qrId} ya tiene estado final: ${syncStatus.final_status}, no programando más verificaciones`);
        return;
      }

      // Obtener estado actual del QR
      const qrDetails = await paymentSyncService.getByQrId(qrId);
      if (!qrDetails) return;

      // Verificar si el QR está expirado
      const now = new Date();
      const dueDate = new Date(qrDetails.dueDate);
      if (now > dueDate) {
        console.log(`⏰ QR ${qrId} expirado, no programando más verificaciones`);
        return;
      }

      // Verificar si ya se han hecho demasiadas verificaciones
      if (syncStatus && syncStatus.checkCount >= 20) {
        console.log(`⏹️ Máximo de verificaciones alcanzado para QR: ${qrId}`);
        return;
      }

      // Determinar delay basado en estado
      let delay = 0;
      let priority: 'high' | 'medium' | 'low' = 'low';

      switch (qrDetails.status) {
        case 'pending':
          delay = 2 * 60 * 1000; // 2 minutos
          priority = 'high';
          break;
        case 'processing':
          delay = 5 * 60 * 1000; // 5 minutos
          priority = 'medium';
          break;
        case 'active':
          delay = 15 * 60 * 1000; // 15 minutos
          priority = 'low';
          break;
        case 'completed':
        case 'cancelled':
        case 'expired':
          // No programar más verificaciones para QRs finalizados
          console.log(`🏁 QR ${qrId} en estado final: ${qrDetails.status}, no programando más verificaciones`);
          return;
      }

      // Agregar próxima verificación
      await this.addPaymentSyncJob({
        qrId,
        accountId,
        priority,
        delay
      });

      console.log(`⏰ Próxima verificación programada para QR ${qrId} en ${delay / 1000 / 60} minutos`);
    } catch (error) {
      console.error(`Error programando próxima sincronización para QR ${qrId}:`, error);
    }
  }

  /**
   * Obtener estado de sincronización de un QR
   */
  private async getSyncStatus(qrId: string): Promise<any> {
    try {
      const { query } = await import('../config/database');
      const result = await query(`
        SELECT check_count, last_checked, success, final_status
        FROM payment_sync_status 
        WHERE qr_id = $1
      `, [qrId]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error obteniendo estado de sincronización:', error);
      return null;
    }
  }

  /**
   * Convertir prioridad a número para BullMQ
   */
  private getJobPriority(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(): void {
    // Eventos del worker
    this.paymentSyncWorker.on('completed', (job) => {
      console.log(`✅ Trabajo completado: ${job.id} - QR: ${job.data.qrId}`);
    });

    this.paymentSyncWorker.on('failed', (job, err) => {
      console.error(`❌ Trabajo fallido: ${job?.id} - QR: ${job?.data.qrId}`, err.message);
    });

    this.paymentSyncWorker.on('stalled', (jobId) => {
      console.warn(`⚠️ Trabajo estancado: ${jobId}`);
    });

    // Eventos de cola
    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`⏳ Trabajo en cola: ${jobId}`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      console.log(`🔄 Trabajo activo: ${jobId}`);
    });
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.paymentSyncQueue.getWaiting(),
      this.paymentSyncQueue.getActive(),
      this.paymentSyncQueue.getCompleted(),
      this.paymentSyncQueue.getFailed(),
      this.paymentSyncQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * Limpiar trabajos antiguos
   */
  async cleanOldJobs(): Promise<void> {
    await this.paymentSyncQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 24 horas
    await this.paymentSyncQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // 7 días
  }

  /**
   * Cerrar conexiones
   */
  async close(): Promise<void> {
    console.log('🛑 Cerrando Payment Queue Service...');
    
    await this.paymentSyncWorker.close();
    await this.paymentCleanupWorker.close();
    await this.paymentSyncQueue.close();
    await this.paymentCleanupQueue.close();
    await this.queueEvents.close();
    await this.redis.quit();
    
    console.log('✅ Payment Queue Service cerrado');
  }
}

export default new PaymentQueueService();
