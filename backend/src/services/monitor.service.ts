import { query } from '../config/database';
import { CronJob } from 'cron';
import { qrService } from './qr.service';

type ActivityStatus = 'SUCCESS' | 'ERROR' | 'WARNING' | 'FAILED';

// Función para registrar actividad en el sistema
export async function logActivity(
  actionType: string,
  actionDetails: any,
  status: ActivityStatus,
  companyId?: number,
  userId?: number
): Promise<void> {
  try {
    await query(
      'INSERT INTO activity_logs (company_id, action_type, action_details, status) VALUES ($1, $2, $3, $4)',
      [companyId || null, actionType, actionDetails, status]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Función para obtener estadísticas de uso del sistema
export async function getSystemStats(companyId?: number): Promise<{
  activeQrCount: number;
  paidQrCount: number;
  expiredQrCount: number;
  cancelledQrCount: number;
  totalAmount: Record<string, number>;
  errorCount: number;
  lastErrors: any[];
}> {
  try {
    // Preparar la condición WHERE para filtrar por compañía si es necesario
    const companyFilter = companyId ? 'AND company_id = $1' : '';
    const companyParams = companyId ? [companyId] : [];
    
    // Contar QRs por estado
    const qrStatusResult = await query(`
      SELECT status, COUNT(*) as count
      FROM qr_codes
      WHERE 1=1 ${companyFilter}
      GROUP BY status
    `, companyParams);
    
    // Obtener montos totales por moneda
    const amountResult = await query(`
      SELECT currency, SUM(amount) as total
      FROM qr_payments
      WHERE 1=1 ${companyFilter}
      GROUP BY currency
    `, companyParams);
    
    // Obtener recuento de errores recientes
    const errorResult = await query(`
      SELECT COUNT(*) as count
      FROM activity_logs
      WHERE (status = 'ERROR' OR status = 'FAILED')
      AND created_at > NOW() - INTERVAL '24 hours'
      ${companyFilter ? 'AND company_id = $1' : ''}
    `, companyParams);
    
    // Obtener últimos errores
    const lastErrorsResult = await query(`
      SELECT action_type, action_details, created_at
      FROM activity_logs
      WHERE (status = 'ERROR' OR status = 'FAILED')
      ${companyFilter ? 'AND company_id = $1' : ''}
      ORDER BY created_at DESC
      LIMIT 5
    `, companyParams);
    
    // Procesar resultados
    const statusCounts: Record<string, number> = {
      'ACTIVE': 0,
      'PAID': 0,
      'EXPIRED': 0,
      'CANCELLED': 0
    };
    
    qrStatusResult.rows.forEach((row: any) => {
      statusCounts[row.status] = parseInt(row.count);
    });
    
    const totalAmount: Record<string, number> = {};
    
    amountResult.rows.forEach((row: any) => {
      totalAmount[row.currency] = parseFloat(row.total);
    });
    
    return {
      activeQrCount: statusCounts['ACTIVE'] || 0,
      paidQrCount: statusCounts['PAID'] || 0,
      expiredQrCount: statusCounts['EXPIRED'] || 0,
      cancelledQrCount: statusCounts['CANCELLED'] || 0,
      totalAmount,
      errorCount: parseInt(errorResult.rows[0]?.count || '0'),
      lastErrors: lastErrorsResult.rows
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      activeQrCount: 0,
      paidQrCount: 0,
      expiredQrCount: 0,
      cancelledQrCount: 0,
      totalAmount: {},
      errorCount: 0,
      lastErrors: []
    };
  }
}

// Función para obtener estadísticas de empresas
export async function getCompaniesStats(): Promise<{
  totalCompanies: number;
  activeCompanies: number;
  totalApiKeys: number;
  activeApiKeys: number;
  companiesWithMostQRs: any[];
}> {
  try {
    // Contar empresas
    const companiesResult = await query(`
      SELECT 
        COUNT(*) as total_companies,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_companies
      FROM companies
    `);
    
    // Contar API keys
    const apiKeysResult = await query(`
      SELECT 
        COUNT(*) as total_keys,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_keys
      FROM api_keys
    `);
    
    // Empresas con más QRs generados
    const topCompaniesResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.business_id,
        COUNT(qr.id) as qr_count,
        SUM(CASE WHEN qr.status = 'PAID' THEN 1 ELSE 0 END) as paid_count
      FROM companies c
      LEFT JOIN qr_codes qr ON c.id = qr.company_id
      GROUP BY c.id, c.name, c.business_id
      ORDER BY qr_count DESC
      LIMIT 5
    `);
    
    return {
      totalCompanies: parseInt(companiesResult.rows[0]?.total_companies || '0'),
      activeCompanies: parseInt(companiesResult.rows[0]?.active_companies || '0'),
      totalApiKeys: parseInt(apiKeysResult.rows[0]?.total_keys || '0'),
      activeApiKeys: parseInt(apiKeysResult.rows[0]?.active_keys || '0'),
      companiesWithMostQRs: topCompaniesResult.rows
    };
  } catch (error) {
    console.error('Error getting companies stats:', error);
    return {
      totalCompanies: 0,
      activeCompanies: 0,
      totalApiKeys: 0,
      activeApiKeys: 0,
      companiesWithMostQRs: []
    };
  }
}

// Iniciar tareas programadas
export function initScheduledTasks() {
  // Verificar QRs cercanos a expirar (cada 6 horas)
  new CronJob('0 */6 * * *', async () => {
    console.log('🔍 Running scheduled check for expiring QR codes');
    await qrService.checkExpiringQRs();
  }, null, true);
  
  // Actualizar QRs expirados (cada hora)
  new CronJob('0 * * * *', async () => {
    console.log('🔄 Running scheduled update for expired QR codes');
    await qrService.updateExpiredQRs();
  }, null, true);
  
  // Limpiar registros antiguos (una vez por día a las 3 AM)
  new CronJob('0 3 * * *', async () => {
    try {
      console.log('🧹 Cleaning old activity logs');
      
      // Eliminar registros de actividad con más de 30 días
      const result = await query(`
        DELETE FROM activity_logs
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING id
      `);
      
      console.log(`🧹 Deleted ${result.rowCount} old activity logs`);
    } catch (error) {
      console.error('Error cleaning activity logs:', error);
    }
  }, null, true);
  
  console.log('⏰ Scheduled tasks initialized');
} 