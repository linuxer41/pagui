import { pool, query } from '../config/database';
import { AccountService } from './account.service';

export interface Transaction {
  id: number;
  qrId?: string;
  accountId: number;
  transactionId: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  senderName?: string;
  description?: string;
  status: string;
  createdAt: Date;
}

export interface TransactionFilters {
  accountId?: number;
  type?: 'incoming' | 'outgoing';
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export class TransactionService {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  /**
   * Crear una nueva transacción
   */
  async createTransaction(
    accountId: number,
    transactionId: string,
    amount: number,
    type: 'incoming' | 'outgoing',
    qrId?: string,
    senderName?: string,
    description?: string
  ): Promise<number> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Crear la transacción
      const transactionResult = await client.query(`
        INSERT INTO transactions (qr_id, account_id, transaction_id, amount, type, sender_name, description, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
        RETURNING id
      `, [qrId, accountId, transactionId, amount, type, senderName, description]);
      
      const transactionIdResult = transactionResult.rows[0].id;
      
      // Si es una transacción entrante, crear movimiento de cuenta
      if (type === 'incoming') {
        await this.accountService.createAccountMovement(
          accountId,
          'qr_payment',
          amount,
          description || 'Pago QR recibido',
          transactionId,
          'qr_payment'
        );
      }
      
      await client.query('COMMIT');
      return transactionIdResult;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener transacciones con filtros
   */
  async listTransactions(
    userId: number,
    filters: TransactionFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ transactions: Transaction[]; total: number; totalPages: number }> {
    // Obtener cuentas del usuario
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(acc => acc.id);
    
    if (accountIds.length === 0) {
      return { transactions: [], total: 0, totalPages: 0 };
    }
    
    // Construir consulta base
    let whereClause = 'WHERE t.account_id = ANY($1)';
    const queryParams: any[] = [accountIds];
    let paramIndex = 2;
    
    if (filters.accountId) {
      whereClause += ` AND t.account_id = $${paramIndex}`;
      queryParams.push(filters.accountId);
      paramIndex++;
    }
    
    if (filters.type) {
      whereClause += ` AND t.type = $${paramIndex}`;
      queryParams.push(filters.type);
      paramIndex++;
    }
    
    if (filters.status) {
      whereClause += ` AND t.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    if (filters.startDate) {
      whereClause += ` AND t.created_at >= $${paramIndex}`;
      queryParams.push(filters.startDate);
      paramIndex++;
    }
    
    if (filters.endDate) {
      whereClause += ` AND t.created_at <= $${paramIndex}`;
      queryParams.push(filters.endDate);
      paramIndex++;
    }
    
    if (filters.minAmount !== undefined) {
      whereClause += ` AND t.amount >= $${paramIndex}`;
      queryParams.push(filters.minAmount);
      paramIndex++;
    }
    
    if (filters.maxAmount !== undefined) {
      whereClause += ` AND t.amount <= $${paramIndex}`;
      queryParams.push(filters.maxAmount);
      paramIndex++;
    }
    
    // Obtener total de transacciones
    const countResult = await query(`
      SELECT COUNT(*) as total FROM transactions t ${whereClause}
    `, queryParams);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    
    // Obtener transacciones
    const result = await query(`
      SELECT 
        t.id,
        t.qr_id as "qrId",
        t.account_id as "accountId",
        t.transaction_id as "transactionId",
        t.amount,
        t.type,
        t.sender_name as "senderName",
        t.description,
        t.status,
        t.created_at as "createdAt"
      FROM transactions t 
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, pageSize, offset]);
    
    const transactions: Transaction[] = result.rows.map(row => ({
      id: row.id,
      qrId: row.qrId,
      accountId: row.accountId,
      transactionId: row.transactionId,
      amount: parseFloat(row.amount),
      type: row.type,
      senderName: row.senderName,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt
    }));
    
    return { transactions, total, totalPages };
  }

  /**
   * Obtener una transacción específica
   */
  async getTransaction(transactionId: string, userId: number): Promise<Transaction | null> {
    // Verificar que el usuario tiene acceso a la cuenta de la transacción
    const result = await query(`
      SELECT 
        t.id,
        t.qr_id as "qrId",
        t.account_id as "accountId",
        t.transaction_id as "transactionId",
        t.amount,
        t.type,
        t.sender_name as "senderName",
        t.description,
        t.status,
        t.created_at as "createdAt"
      FROM transactions t
      INNER JOIN user_accounts ua ON t.account_id = ua.account_id
      WHERE t.transaction_id = $1 AND ua.user_id = $2
    `, [transactionId, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      qrId: row.qrId,
      accountId: row.accountId,
      transactionId: row.transactionId,
      amount: parseFloat(row.amount),
      type: row.type,
      senderName: row.senderName,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt
    };
  }

  /**
   * Obtener estadísticas de transacciones
   */
  async getTransactionStats(userId: number, accountId?: number): Promise<{
    totalIncoming: number;
    totalOutgoing: number;
    totalTransactions: number;
    averageAmount: number;
  }> {
    // Obtener cuentas del usuario
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = accountId ? [accountId] : userAccounts.map(acc => acc.id);
    
    if (accountIds.length === 0) {
      return { totalIncoming: 0, totalOutgoing: 0, totalTransactions: 0, averageAmount: 0 };
    }
    
    const result = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN type = 'incoming' THEN amount ELSE 0 END), 0) as total_incoming,
        COALESCE(SUM(CASE WHEN type = 'outgoing' THEN amount ELSE 0 END), 0) as total_outgoing,
        COALESCE(AVG(amount), 0) as average_amount
      FROM transactions 
      WHERE account_id = ANY($1)
    `, [accountIds]);
    
    const row = result.rows[0];
    return {
      totalIncoming: parseFloat(row.total_incoming),
      totalOutgoing: parseFloat(row.total_outgoing),
      totalTransactions: parseInt(row.total_transactions),
      averageAmount: parseFloat(row.average_amount)
    };
  }

  /**
   * Actualizar estado de una transacción
   */
  async updateTransactionStatus(
    transactionId: string,
    status: string,
    userId: number
  ): Promise<boolean> {
    // Verificar que el usuario tiene acceso
    const accessCheck = await query(`
      SELECT t.id FROM transactions t
      INNER JOIN user_accounts ua ON t.account_id = ua.account_id
      WHERE t.transaction_id = $1 AND ua.user_id = $2
    `, [transactionId, userId]);
    
    if (accessCheck.rows.length === 0) {
      return false;
    }
    
    const result = await query(`
      UPDATE transactions 
      SET status = $1 
      WHERE transaction_id = $2
    `, [status, transactionId]);
    
    return result.rowCount > 0;
  }
}

export default new TransactionService(); 