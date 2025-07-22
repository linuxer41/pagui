import { query } from '../config/database';
import { logActivity } from './monitor.service';

// Interfaces
interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  type?: string;
  minAmount?: number;
  maxAmount?: number;
  bankId?: number;
  page?: number;
  pageSize?: number;
}

interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  from?: string;
  to?: string;
  date: string;
  status: 'completed' | 'pending' | 'canceled';
  reference?: string;
  category?: string;
  metadata?: Record<string, any>;
}

interface TransactionListResponse {
  transactions: Transaction[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  responseCode: number;
  message?: string;
}

interface TransactionDay {
  date: Date;
  amount: number;
  count: number;
  formatted: {
    date: string;
    day: number;
    month: string;
    amount: string;
  };
}

interface TransactionMonth {
  date: Date;
  amount: number;
  count: number;
  formatted: {
    month: string;
    amount: string;
  };
}

interface TransactionSummary {
  total: number;
  count: number;
  period: {
    startDate: string;
    endDate: string;
    type: 'weekly' | 'monthly' | 'yearly';
    year: number;
    month?: number;
    week?: number;
  };
}

interface TransactionsResponse {
  data: TransactionDay[] | TransactionMonth[];
  summary: TransactionSummary;
  responseCode: number;
}

class TransactionService {
  // Listar transacciones con filtros
  async listTransactions(
    companyId: number,
    filters: TransactionFilters = {},
    userId?: number
  ): Promise<TransactionListResponse> {
    try {
      // Parámetros de paginación
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 20;
      const offset = (page - 1) * pageSize;
      
      // Construir consulta base
      let sqlQuery = `
        SELECT 
          t.id,
          t.qr_id as "qrId",
          t.transaction_id as "transactionId",
          t.payment_date as "paymentDate",
          t.currency,
          t.amount,
          t.type,
          t.sender_name as "senderName",
          t.sender_document_id as "senderDocumentId",
          t.sender_account as "senderAccount",
          t.description,
          t.metadata,
          t.status,
          b.name as "bankName",
          qc.transaction_id as "originalTransactionId"
        FROM transactions t
        INNER JOIN company_bank cb ON t.company_bank_id = cb.id 
        LEFT JOIN banks b ON cb.bank_id = b.id
        LEFT JOIN qr_codes qc ON t.qr_id = qc.qr_id
        WHERE t.company_id = $1
      `;
      
      // Array para almacenar los parámetros
      const queryParams: any[] = [companyId];
      let paramIndex = 2; // Empezamos desde $2
      
      // Aplicar filtros
      if (filters.status) {
        sqlQuery += ` AND t.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }
      
      if (filters.type) {
        sqlQuery += ` AND t.type = $${paramIndex}`;
        queryParams.push(filters.type);
        paramIndex++;
      }
      
      if (filters.startDate) {
        sqlQuery += ` AND t.payment_date >= $${paramIndex}`;
        queryParams.push(filters.startDate);
        paramIndex++;
      }
      
      if (filters.endDate) {
        sqlQuery += ` AND t.payment_date <= $${paramIndex}`;
        queryParams.push(filters.endDate);
        paramIndex++;
      }
      
      if (filters.minAmount !== undefined) {
        sqlQuery += ` AND t.amount >= $${paramIndex}`;
        queryParams.push(filters.minAmount);
        paramIndex++;
      }
      
      if (filters.maxAmount !== undefined) {
        sqlQuery += ` AND t.amount <= $${paramIndex}`;
        queryParams.push(filters.maxAmount);
        paramIndex++;
      }
      
      if (filters.bankId) {
        sqlQuery += ` AND cb.bank_id = $${paramIndex}`;
        queryParams.push(filters.bankId);
        paramIndex++;
      }
      
      // Ordenar por fecha y hora de pago descendente
      sqlQuery += ` ORDER BY t.payment_date DESC`;
      
      // Añadir paginación
      sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(pageSize, offset);
      
      // Ejecutar la consulta
      const result = await query(sqlQuery, queryParams);
      
      // Construir la consulta de conteo
      let countQuery = `
        SELECT COUNT(*) as total
        FROM transactions t
        WHERE t.company_id = $1
      `;
      
      // Aplicar los mismos filtros a la consulta de conteo
      const countParams = [companyId];
      let countParamIndex = 2;
      
      if (filters.status) {
        countQuery += ` AND t.status = $${countParamIndex}`;
        countParams.push(filters.status);
        countParamIndex++;
      }
      
      if (filters.type) {
        countQuery += ` AND t.type = $${countParamIndex}`;
        countParams.push(filters.type);
        countParamIndex++;
      }
      
      if (filters.startDate) {
        countQuery += ` AND t.payment_date >= $${countParamIndex}`;
        countParams.push(filters.startDate);
        countParamIndex++;
      }
      
      if (filters.endDate) {
        countQuery += ` AND t.payment_date <= $${countParamIndex}`;
        countParams.push(filters.endDate);
        countParamIndex++;
      }
      
      if (filters.minAmount !== undefined) {
        countQuery += ` AND t.amount >= $${countParamIndex}`;
        countParams.push(filters.minAmount);
        countParamIndex++;
      }
      
      if (filters.maxAmount !== undefined) {
        countQuery += ` AND t.amount <= $${countParamIndex}`;
        countParams.push(filters.maxAmount);
        countParamIndex++;
      }
      
      if (filters.bankId) {
        countQuery += ` AND cb.bank_id = $${countParamIndex}`;
        countParams.push(filters.bankId);
      }
      
      // Ejecutar la consulta de conteo
      const countResult = await query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / pageSize);
      
      // Transformar los resultados
      const transactions: Transaction[] = result.rows.map(row => {
        // Determinar from/to según el tipo de transacción
        let from = undefined;
        let to = undefined;
        
        if (row.type === 'incoming') {
          from = row.senderName;
        } else if (row.type === 'outgoing') {
          to = row.senderName;
        }
        
        // Extraer metadata o usar un objeto vacío
        let metadata = {};
        try {
          if (row.metadata) {
            if (typeof row.metadata === 'string') {
              metadata = JSON.parse(row.metadata);
            } else {
              metadata = row.metadata;
            }
          }
        } catch (error) {
          console.error('Error parsing metadata:', error);
        }
        
        // Añadir información adicional a metadata
        metadata = {
          ...metadata,
          qrId: row.qrId,
          senderAccount: row.senderAccount,
          senderDocumentId: row.senderDocumentId,
          bankName: row.bankName
        };
        
        return {
          id: row.transactionId,
          type: row.type,
          amount: parseFloat(row.amount),
          from,
          to,
          date: `${row.paymentDate}T${row.paymentTime}`,
          status: row.status,
          reference: row.originalTransactionId || row.qrId,
          category: 'payment',
          metadata
        };
      });
      
      // Registrar actividad
      if (userId) {
        await logActivity(
          'TRANSACTIONS_LISTED',
          {
            filters,
            count: transactions.length,
            totalCount
          },
          'INFO',
          companyId,
          userId
        );
      }
      
      return {
        transactions,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages
        },
        responseCode: 0
      };
    } catch (error) {
      console.error('Error listando transacciones:', error);
      
      // Registrar error
      if (userId) {
        await logActivity(
          'TRANSACTIONS_LIST_ERROR',
          {
            error: error instanceof Error ? error.message : 'Error desconocido'
          },
          'ERROR',
          companyId,
          userId
        );
      }
      
      return {
        transactions: [],
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error listando transacciones'
      };
    }
  }
  
  // Obtener detalle de una transacción
  async getTransactionDetail(
    companyId: number,
    transactionId: string,
    userId?: number
  ): Promise<{ transaction?: Transaction; responseCode: number; message?: string }> {
    try {
      // Buscar la transacción por ID
      const result = await query(`
        SELECT 
          t.id,
          t.qr_id as "qrId",
          t.transaction_id as "transactionId",
          t.payment_date as "paymentDate",
          t.currency,
          t.amount,
          t.type,
          t.sender_name as "senderName",
          t.sender_document_id as "senderDocumentId",
          t.sender_account as "senderAccount",
          t.description,
          t.metadata,
          t.status,
          b.name as "bankName",
          qc.transaction_id as "originalTransactionId"
        FROM transactions t
        LEFT JOIN banks b ON t.bank_id = b.id
        LEFT JOIN qr_codes qc ON t.qr_id = qc.qr_id
        WHERE t.company_id = $1 AND t.transaction_id = $2
      `, [companyId, transactionId]);
      
      if (result.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Transacción no encontrada'
        };
      }
      
      const row = result.rows[0];
      
      // Determinar from/to según el tipo de transacción
      let from = undefined;
      let to = undefined;
      
      if (row.type === 'incoming') {
        from = row.senderName;
      } else if (row.type === 'outgoing') {
        to = row.senderName;
      }
      
      // Extraer metadata o usar un objeto vacío
      let metadata = {};
      try {
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            metadata = JSON.parse(row.metadata);
          } else {
            metadata = row.metadata;
          }
        }
      } catch (error) {
        console.error('Error parsing metadata:', error);
      }
      
      // Añadir información adicional a metadata
      metadata = {
        ...metadata,
        qrId: row.qrId,
        senderAccount: row.senderAccount,
        senderDocumentId: row.senderDocumentId,
        bankName: row.bankName
      };
      
      // Transformar al formato esperado
      const transaction: Transaction = {
        id: row.transactionId,
        type: row.type,
        amount: parseFloat(row.amount),
        from,
        to,
        date: `${row.paymentDate}T${row.paymentTime}`,
        status: row.status,
        reference: row.originalTransactionId || row.qrId,
        category: 'payment',
        metadata
      };
      
      // Registrar actividad
      if (userId) {
        await logActivity(
          'TRANSACTION_VIEWED',
          {
            transactionId
          },
          'INFO',
          companyId,
          userId
        );
      }
      
      return {
        transaction,
        responseCode: 0
      };
    } catch (error) {
      console.error('Error obteniendo detalle de transacción:', error);
      
      // Registrar error
      if (userId) {
        await logActivity(
          'TRANSACTION_DETAIL_ERROR',
          {
            transactionId,
            error: error instanceof Error ? error.message : 'Error desconocido'
          },
          'ERROR',
          companyId,
          userId
        );
      }
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error obteniendo detalle de transacción'
      };
    }
  }
  
  // Obtener estadísticas de transacciones por período
  async getTransactionStats(
    companyId: number,
    periodType: 'weekly' | 'monthly' | 'yearly',
    year: number,
    month?: number,
    week?: number,
    userId?: number
  ): Promise<TransactionsResponse | { responseCode: number; message: string }> {
    try {
      // Validar parámetros
      if (periodType === 'monthly' && month === undefined) {
        return {
          responseCode: 1,
          message: 'Se requiere el mes para estadísticas mensuales'
        };
      }
      
      if (periodType === 'weekly' && week === undefined) {
        return {
          responseCode: 1,
          message: 'Se requiere la semana para estadísticas semanales'
        };
      }
      
      // Función para formatear montos con separador de miles y decimales
      const formatCurrency = (amount: number): string => {
        return amount.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      };
      
      // Función para obtener nombres de los meses
      const getMonthName = (monthIndex: number): string => {
        const months = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[monthIndex];
      };
      
      let data: TransactionDay[] | TransactionMonth[] = [];
      let startDate: Date;
      let endDate: Date;
      let sqlQuery: string;
      let queryParams: any[];
      
      // Construir consulta según el tipo de período
      if (periodType === 'yearly') {
        // Estadísticas por mes para un año completo
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        
        sqlQuery = `
          SELECT 
            EXTRACT(MONTH FROM payment_date) as month,
            SUM(amount) as total_amount,
            COUNT(*) as count
          FROM transactions
          WHERE company_id = $1
            AND payment_date >= $2
            AND payment_date <= $3
          GROUP BY EXTRACT(MONTH FROM payment_date)
          ORDER BY month
        `;
        
        queryParams = [companyId, startDate.toISOString(), endDate.toISOString()];
        
        const result = await query(sqlQuery, queryParams);
        
        // Transformar resultados
        data = Array.from({ length: 12 }, (_, i) => {
          const monthData = result.rows.find(row => parseInt(row.month) === i + 1);
          const amount = monthData ? parseFloat(monthData.total_amount) : 0;
          const count = monthData ? parseInt(monthData.count) : 0;
          
          return {
            date: new Date(year, i, 1),
            amount,
            count,
            formatted: {
              month: getMonthName(i),
              amount: formatCurrency(amount)
            }
          };
        });
      } else if (periodType === 'monthly' && month !== undefined) {
        // Estadísticas por día para un mes específico
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0); // Último día del mes
        
        sqlQuery = `
          SELECT 
            EXTRACT(DAY FROM payment_date) as day,
            SUM(amount) as total_amount,
            COUNT(*) as count
          FROM transactions
          WHERE company_id = $1
            AND payment_date >= $2
            AND payment_date <= $3
          GROUP BY EXTRACT(DAY FROM payment_date)
          ORDER BY day
        `;
        
        queryParams = [companyId, startDate.toISOString(), endDate.toISOString()];
        
        const result = await query(sqlQuery, queryParams);
        
        // Transformar resultados
        const daysInMonth = endDate.getDate();
        data = Array.from({ length: daysInMonth }, (_, i) => {
          const dayData = result.rows.find(row => parseInt(row.day) === i + 1);
          const amount = dayData ? parseFloat(dayData.total_amount) : 0;
          const count = dayData ? parseInt(dayData.count) : 0;
          const currentDate = new Date(year, month - 1, i + 1);
          
          return {
            date: currentDate,
            amount,
            count,
            formatted: {
              date: currentDate.toISOString().split('T')[0],
              day: i + 1,
              month: getMonthName(month - 1).substring(0, 3),
              amount: formatCurrency(amount)
            }
          };
        });
      } else if (periodType === 'weekly' && week !== undefined) {
        // Estadísticas por día para una semana específica
        // Calcular la fecha de inicio de la semana (asumiendo que la semana 1 comienza el 1 de enero)
        const firstDayOfYear = new Date(year, 0, 1);
        startDate = new Date(firstDayOfYear);
        startDate.setDate(firstDayOfYear.getDate() + (week - 1) * 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        sqlQuery = `
          SELECT 
            payment_date::date as day,
            SUM(amount) as total_amount,
            COUNT(*) as count
          FROM transactions
          WHERE company_id = $1
            AND payment_date >= $2
            AND payment_date <= $3
          GROUP BY payment_date::date
          ORDER BY day
        `;
        
        queryParams = [companyId, startDate.toISOString(), endDate.toISOString()];
        
        const result = await query(sqlQuery, queryParams);
        
        // Transformar resultados
        data = Array.from({ length: 7 }, (_, i) => {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          const formattedDate = currentDate.toISOString().split('T')[0];
          
          const dayData = result.rows.find(row => row.day.split('T')[0] === formattedDate);
          const amount = dayData ? parseFloat(dayData.total_amount) : 0;
          const count = dayData ? parseInt(dayData.count) : 0;
          
          return {
            date: currentDate,
            amount,
            count,
            formatted: {
              date: formattedDate,
              day: currentDate.getDate(),
              month: getMonthName(currentDate.getMonth()).substring(0, 3),
              amount: formatCurrency(amount)
            }
          };
        });
      } else {
        return {
          responseCode: 1,
          message: 'Tipo de período no válido'
        };
      }
      
      // Calcular totales
      const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
      const totalCount = data.reduce((sum, item) => sum + item.count, 0);
      
      // Construir resumen
      const summary: TransactionSummary = {
        total: totalAmount,
        count: totalCount,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: periodType,
          year
        }
      };
      
      // Añadir mes o semana al resumen si corresponde
      if (periodType === 'monthly' && month !== undefined) {
        summary.period.month = month;
      } else if (periodType === 'weekly' && week !== undefined) {
        summary.period.week = week;
      }
      
      // Registrar actividad
      if (userId) {
        await logActivity(
          'TRANSACTIONS_STATS_VIEWED',
          {
            periodType,
            year,
            month,
            week,
            totalAmount,
            totalCount
          },
          'INFO',
          companyId,
          userId
        );
      }
      
      // Construir respuesta
      const response: TransactionsResponse = {
        data,
        summary,
        responseCode: 0
      };
      
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas de transacciones:', error);
      
      // Registrar error
      if (userId) {
        await logActivity(
          'TRANSACTIONS_STATS_ERROR',
          {
            periodType,
            year,
            month,
            week,
            error: error instanceof Error ? error.message : 'Error desconocido'
          },
          'ERROR',
          companyId,
          userId
        );
      }
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error obteniendo estadísticas de transacciones'
      };
    }
  }
  
  // Crear una nueva transacción
  async createTransaction(
    companyId: number,
    transactionData: {
      qrId?: string;
      bankId?: number;
      transactionId: string;
      paymentDate: Date;
      paymentTime: string;
      currency: string;
      amount: number;
      type: 'incoming' | 'outgoing';
      senderName?: string;
      senderDocumentId?: string;
      senderAccount?: string;
      description?: string;
      metadata?: Record<string, any>;
      status?: string;
    },
    userId?: number
  ): Promise<{ responseCode: number; message: string; transactionId?: string }> {
    try {
      // Validar datos mínimos
      if (!transactionData.transactionId || !transactionData.amount || !transactionData.type) {
        return {
          responseCode: 1,
          message: 'Faltan datos obligatorios para la transacción'
        };
      }
      
      // Preparar los datos para la inserción
      const paymentDate = transactionData.paymentDate || new Date();
      const paymentTime = transactionData.paymentTime || paymentDate.toTimeString().split(' ')[0];
      const status = transactionData.status || 'completed';
      
      // Convertir metadata a JSONB si existe
      let metadata = null;
      if (transactionData.metadata) {
        metadata = JSON.stringify(transactionData.metadata);
      }
      
      // Insertar la transacción
      const result = await query(`
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
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING transaction_id
      `, [
        transactionData.qrId || null,
        companyId,
        transactionData.bankId || null,
        transactionData.transactionId,
        paymentDate,
        paymentTime,
        transactionData.currency || 'BOB',
        transactionData.amount,
        transactionData.type,
        transactionData.senderName || null,
        transactionData.senderDocumentId || null,
        transactionData.senderAccount || null,
        transactionData.description || null,
        metadata,
        status
      ]);
      
      // Registrar actividad
      if (userId) {
        await logActivity(
          'TRANSACTION_CREATED',
          {
            transactionId: transactionData.transactionId,
            amount: transactionData.amount,
            type: transactionData.type
          },
          'INFO',
          companyId,
          userId
        );
      }
      
      return {
        responseCode: 0,
        message: 'Transacción creada exitosamente',
        transactionId: result.rows[0].transaction_id
      };
    } catch (error) {
      console.error('Error creando transacción:', error);
      
      // Registrar error
      if (userId) {
        await logActivity(
          'TRANSACTION_CREATE_ERROR',
          {
            error: error instanceof Error ? error.message : 'Error desconocido'
          },
          'ERROR',
          companyId,
          userId
        );
      }
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error creando transacción'
      };
    }
  }
}

export const transactionService = new TransactionService();
export default transactionService; 