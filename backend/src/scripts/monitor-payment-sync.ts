#!/usr/bin/env bun

import { query } from '../config/database';

/**
 * Script para monitorear el sistema de sincronización de pagos
 */

interface SyncStats {
  totalQRs: number;
  pendingSync: number;
  completedSync: number;
  failedSync: number;
  finalStatusCounts: Record<string, number>;
  recentActivity: any[];
  queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

class PaymentSyncMonitor {
  /**
   * Obtener estadísticas completas del sistema
   */
  async getStats(): Promise<SyncStats> {
    try {
      // Estadísticas de QRs
      const qrStats = await this.getQRStats();
      
      // Estadísticas de sincronización
      const syncStats = await this.getSyncStats();
      
      // Actividad reciente
      const recentActivity = await this.getRecentActivity();
      
      // Estadísticas de cola (si Redis está disponible)
      const queueStats = await this.getQueueStats();

      return {
        ...qrStats,
        ...syncStats,
        recentActivity,
        queueStats
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de QRs
   */
  private async getQRStats(): Promise<{ totalQRs: number; pendingSync: number }> {
    const result = await query(`
      SELECT 
        COUNT(*) as total_qrs,
        COUNT(CASE WHEN ps.qr_id IS NULL THEN 1 END) as pending_sync
      FROM qr_codes q
      LEFT JOIN payment_sync_status ps ON q.id = ps.qr_id
      WHERE q.deleted_at IS NULL
        AND q.created_at > NOW() - INTERVAL '7 days'
    `);

    return {
      totalQRs: parseInt(result.rows[0].total_qrs),
      pendingSync: parseInt(result.rows[0].pending_sync)
    };
  }

  /**
   * Obtener estadísticas de sincronización
   */
  private async getSyncStats(): Promise<{
    completedSync: number;
    failedSync: number;
    finalStatusCounts: Record<string, number>;
  }> {
    // Obtener estadísticas generales
    const generalStats = await query(`
      SELECT 
        COUNT(CASE WHEN success = true THEN 1 END) as completed_sync,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_sync
      FROM payment_sync_status
      WHERE last_checked > NOW() - INTERVAL '24 hours'
    `);

    // Obtener conteos por estado final
    const finalStatusResult = await query(`
      SELECT 
        final_status,
        COUNT(*) as count
      FROM payment_sync_status
      WHERE last_checked > NOW() - INTERVAL '24 hours'
        AND final_status IS NOT NULL
      GROUP BY final_status
    `);

    const finalStatusCounts: Record<string, number> = {};
    finalStatusResult.rows.forEach(row => {
      finalStatusCounts[row.final_status] = parseInt(row.count);
    });

    return {
      completedSync: parseInt(generalStats.rows[0].completed_sync),
      failedSync: parseInt(generalStats.rows[0].failed_sync),
      finalStatusCounts
    };
  }

  /**
   * Obtener actividad reciente
   */
  private async getRecentActivity(): Promise<any[]> {
    const result = await query(`
      SELECT 
        ps.qr_id,
        ps.last_checked,
        ps.success,
        ps.final_status,
        ps.check_count,
        q.status as qr_status,
        q.amount,
        q.description
      FROM payment_sync_status ps
      LEFT JOIN qr_codes q ON ps.qr_id = q.id
      WHERE ps.last_checked > NOW() - INTERVAL '1 hour'
        AND q.deleted_at IS NULL
      ORDER BY ps.last_checked DESC
      LIMIT 20
    `);

    return result.rows;
  }

  /**
   * Obtener estadísticas de cola Redis
   */
  private async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    try {
      // Intentar conectar a Redis para obtener estadísticas de cola
      const { Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      const [waiting, active, completed, failed] = await Promise.all([
        redis.llen('bull:payment-sync:waiting'),
        redis.llen('bull:payment-sync:active'),
        redis.llen('bull:payment-sync:completed'),
        redis.llen('bull:payment-sync:failed')
      ]);

      await redis.quit();

      return {
        waiting: parseInt(waiting) || 0,
        active: parseInt(active) || 0,
        completed: parseInt(completed) || 0,
        failed: parseInt(failed) || 0
      };
    } catch (error) {
      console.warn('Redis no disponible para estadísticas de cola:', error.message);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      };
    }
  }

  /**
   * Mostrar estadísticas en consola
   */
  displayStats(stats: SyncStats): void {
    console.log('\n📊 === ESTADÍSTICAS DEL SISTEMA DE SINCRONIZACIÓN ===');
    
    console.log('\n🔢 QRs:');
    console.log(`   Total QRs (7 días): ${stats.totalQRs}`);
    console.log(`   Pendientes de sincronización: ${stats.pendingSync}`);
    
    console.log('\n🔄 Sincronización (24 horas):');
    console.log(`   ✅ Exitosas: ${stats.completedSync}`);
    console.log(`   ❌ Fallidas: ${stats.failedSync}`);
    
    if (Object.keys(stats.finalStatusCounts).length > 0) {
      console.log('\n🏁 Estados finales:');
      Object.entries(stats.finalStatusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    console.log('\n📋 Cola Redis:');
    console.log(`   ⏳ Esperando: ${stats.queueStats.waiting}`);
    console.log(`   🔄 Activos: ${stats.queueStats.active}`);
    console.log(`   ✅ Completados: ${stats.queueStats.completed}`);
    console.log(`   ❌ Fallidos: ${stats.queueStats.failed}`);
    
    if (stats.recentActivity.length > 0) {
      console.log('\n🕐 Actividad reciente (última hora):');
      stats.recentActivity.slice(0, 10).forEach(activity => {
        const status = activity.success ? '✅' : '❌';
        const finalStatus = activity.final_status ? ` (${activity.final_status})` : '';
        console.log(`   ${status} QR: ${activity.qr_id} - ${activity.qr_status}${finalStatus} - ${activity.last_checked}`);
      });
    }
    
    console.log('\n===============================================\n');
  }

  /**
   * Monitoreo continuo
   */
  async startMonitoring(intervalSeconds: number = 30): Promise<void> {
    console.log(`🔄 Iniciando monitoreo cada ${intervalSeconds} segundos...`);
    console.log('Presiona Ctrl+C para detener\n');

    const monitor = async () => {
      try {
        const stats = await this.getStats();
        this.displayStats(stats);
      } catch (error) {
        console.error('Error en monitoreo:', error);
      }
    };

    // Ejecutar inmediatamente
    await monitor();

    // Programar ejecuciones periódicas
    const interval = setInterval(monitor, intervalSeconds * 1000);

    // Manejar shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Deteniendo monitoreo...');
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitor = new PaymentSyncMonitor();

  try {
    switch (command) {
      case 'stats':
        const stats = await monitor.getStats();
        monitor.displayStats(stats);
        break;

      case 'monitor':
        const interval = args[1] ? parseInt(args[1]) : 30;
        await monitor.startMonitoring(interval);
        break;

      default:
        console.log(`
📊 Payment Sync Monitor

Uso:
  bun run src/scripts/monitor-payment-sync.ts stats
  bun run src/scripts/monitor-payment-sync.ts monitor [intervalo_segundos]

Ejemplos:
  bun run src/scripts/monitor-payment-sync.ts stats        # Mostrar estadísticas una vez
  bun run src/scripts/monitor-payment-sync.ts monitor 30   # Monitoreo cada 30 segundos
  bun run src/scripts/monitor-payment-sync.ts monitor 60   # Monitoreo cada 60 segundos
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.main) {
  main();
}

export default PaymentSyncMonitor;
