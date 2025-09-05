import { pool, query } from '../config/database';
import { logActivity } from './monitor.service';

export interface Account {
  id: number;
  accountNumber: string;
  accountType: 'current' | 'savings' | 'business';
  currency: string;
  balance: number;
  availableBalance: number;
  status: 'active' | 'suspended' | 'closed';
  thirdBankCredentialId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAccount {
  id: number;
  userId: number;
  accountId: number;
  role: 'owner' | 'co-owner' | 'viewer';
  isPrimary: boolean;
  createdAt: Date;
}

export interface UserAccountWithDetails extends Account {
  isPrimary: boolean;
  userRole: 'owner' | 'co-owner' | 'viewer';
}

export interface AccountMovement {
  id: number;
  accountId: number;
  movementType: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'qr_payment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: Date;
}

export class AccountService {
  /**
   * Obtener todas las cuentas de un usuario
   */
  async getUserAccounts(userId: number): Promise<UserAccountWithDetails[]> {
    const result = await query(`
      SELECT 
        a.id,
        a.account_number as "accountNumber",
        a.account_type as "accountType",
        a.currency,
        a.balance,
        a.available_balance as "availableBalance",
        a.status,
        a.third_bank_credential_id as "thirdBankCredentialId",
        a.created_at as "createdAt",
        a.updated_at as "updatedAt",
        ua.is_primary as "isPrimary",
        ua.role as "userRole"
      FROM accounts a
      INNER JOIN user_accounts ua ON a.id = ua.account_id
      WHERE ua.user_id = $1 AND a.status = 'active'
      ORDER BY ua.is_primary DESC, a.created_at ASC
    `, [userId]);
    
    return result.rows;
  }

  /**
   * Obtener una cuenta específica de un usuario
   */
  async getUserAccount(userId: number, accountId: number): Promise<Account | null> {
    const result = await query(`
      SELECT 
        a.id,
        a.account_number as "accountNumber",
        a.account_type as "accountType",
        a.currency,
        a.balance,
        a.available_balance as "availableBalance",
        a.status,
        a.third_bank_credential_id as "thirdBankCredentialId",
        a.created_at as "createdAt",
        a.updated_at as "updatedAt"
      FROM accounts a
      INNER JOIN user_accounts ua ON a.id = ua.account_id
      WHERE ua.user_id = $1 AND a.id = $2 AND a.status = 'active'
    `, [userId, accountId]);
    
    return result.rows[0] || null;
  }

  /**
   * Crear un nuevo movimiento de cuenta
   */
  async createAccountMovement(
    accountId: number,
    movementType: AccountMovement['movementType'],
    amount: number,
    description?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<number> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Obtener balance actual
      const balanceResult = await client.query(
        'SELECT balance FROM accounts WHERE id = $1',
        [accountId]
      );
      
      if (balanceResult.rows.length === 0) {
        throw new Error('Cuenta no encontrada');
      }
      
      const balanceBefore = balanceResult.rows[0].balance;
      const balanceAfter = balanceBefore + amount;
      
      // Insertar movimiento
      const movementResult = await client.query(`
        INSERT INTO account_movements (
          account_id, movement_type, amount, balance_before, balance_after,
          description, reference_id, reference_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [accountId, movementType, amount, balanceBefore, balanceAfter, description, referenceId, referenceType]);
      
      await client.query('COMMIT');
      return movementResult.rows[0].id;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener historial de movimientos de una cuenta
   */
  async getAccountMovements(
    accountId: number,
    limit: number = 50,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date
  ): Promise<AccountMovement[]> {
    let queryText = `
      SELECT 
        id,
        account_id as "accountId",
        movement_type as "movementType",
        amount,
        balance_before as "balanceBefore",
        balance_after as "balanceAfter",
        description,
        reference_id as "referenceId",
        reference_type as "referenceType",
        created_at as "createdAt"
      FROM account_movements 
      WHERE account_id = $1
    `;
    
    const params: any[] = [accountId];
    let paramIndex = 2;
    
    if (startDate) {
      queryText += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      queryText += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Crear una nueva cuenta bancaria
   */
  async createAccount(
    accountNumber: string,
    accountType: Account['accountType'],
    currency: string,
    thirdBankCredentialId: number
  ): Promise<number> {
    const result = await query(`
      INSERT INTO accounts (account_number, account_type, currency, third_bank_credential_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [accountNumber, accountType, currency, thirdBankCredentialId]);
    
    return result.rows[0].id;
  }

  /**
   * Vincular un usuario a una cuenta
   */
  async linkUserToAccount(
    userId: number,
    accountId: number,
    role: UserAccount['role'] = 'viewer',
    isPrimary: boolean = false
  ): Promise<void> {
    await query(`
      INSERT INTO user_accounts (user_id, account_id, role, is_primary)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, account_id) DO UPDATE SET
        role = EXCLUDED.role,
        is_primary = EXCLUDED.is_primary
    `, [userId, accountId, role, isPrimary]);
  }

  /**
   * Obtener balance actual de una cuenta
   */
  async getAccountBalance(accountId: number): Promise<{ balance: number; availableBalance: number }> {
    const result = await query(`
      SELECT 
        balance,
        available_balance as "availableBalance"
      FROM accounts WHERE id = $1
    `, [accountId]);
    
    if (result.rows.length === 0) {
      throw new Error('Cuenta no encontrada');
    }
    
    return result.rows[0];
  }

  /**
   * Realizar transferencia entre cuentas
   */
  async transferBetweenAccounts(
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    description?: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar balance suficiente
      const fromAccountResult = await client.query(
        'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
        [fromAccountId]
      );
      
      if (fromAccountResult.rows.length === 0) {
        throw new Error('Cuenta origen no encontrada');
      }
      
      if (fromAccountResult.rows[0].balance < amount) {
        throw new Error('Balance insuficiente');
      }
      
      // Crear movimientos
      await this.createAccountMovement(
        fromAccountId,
        'transfer_out',
        -amount,
        description || `Transferencia a cuenta ${toAccountId}`,
        toAccountId.toString(),
        'internal_transfer'
      );
      
      await this.createAccountMovement(
        toAccountId,
        'transfer_in',
        amount,
        description || `Transferencia desde cuenta ${fromAccountId}`,
        fromAccountId.toString(),
        'internal_transfer'
      );
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AccountService();
