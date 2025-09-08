import { pool, query } from '../config/database';

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

export interface AccountStats {
  account: {
    id: number;
    accountNumber: string;
    accountType: 'current' | 'savings' | 'business';
    currency: string;
    balance: number;
    availableBalance: number;
    status: 'active' | 'suspended' | 'closed';
  };
  today: {
    amount: number;
    growthPercentage: number;
  };
  thisWeek: {
    amount: number;
    growthPercentage: number;
  };
  thisMonth: {
    amount: number;
    growthPercentage: number;
  };
  recentMovements: AccountMovement[];
}

export interface AccountMovement {
  id: number;
  accountId: number;
  movementType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId: string;
  referenceType: string;
  createdAt: Date;
}

class AccountService {
  /**
   * Obtener todas las cuentas de un usuario
   */
  async getUserAccounts(userId: number): Promise<UserAccountWithDetails[]> {
    const result = await query<UserAccountWithDetails>(`
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
   * Obtener una cuenta específica del usuario
   */
  async getUserAccount(userId: number, accountId: number): Promise<UserAccountWithDetails | null> {
    const result = await query<UserAccountWithDetails>(`
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
      WHERE ua.user_id = $1 AND a.id = $2 AND a.status = 'active'
    `, [userId, accountId]);

    return result.rows[0] || null;
  }

  /**
   * Obtener movimientos de una cuenta con paginación
   */
  async getAccountMovements(
    accountId: number,
    limit: number = 20,
    offset: number = 0,
    startDate?: string,
    endDate?: string
  ): Promise<{ movements: AccountMovement[], total: number, totalPages: number }> {
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
    
    // Primero obtener el total de movimientos
    const countQuery = queryText.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0');
    
    // Luego obtener los movimientos con paginación
    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    const totalPages = Math.ceil(total / limit);
    
    const response = {
      movements: result.rows,
      total,
      totalPages
    };
    console.log('🔍 getAccountMovements response:', response);
    return response;
  }

  /**
   * Obtener todas las cuentas (solo admin)
   */
  async getAllAccounts(): Promise<Account[]> {
    const result = await query<Account>(`
      SELECT 
        id,
        account_number as "accountNumber",
        account_type as "accountType",
        currency,
        balance,
        available_balance as "availableBalance",
        status,
        third_bank_credential_id as "thirdBankCredentialId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM accounts
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);

    return result.rows;
  }

  /**
   * Crear una nueva cuenta
   */
  async createAccount(
    accountNumber: string,
    accountType: string,
    currency: string,
    balance: number,
    availableBalance: number,
    thirdBankCredentialId?: number
  ): Promise<Account> {
    const result = await query<Account>(`
      INSERT INTO accounts (
        account_number, account_type, currency, balance, 
        available_balance, third_bank_credential_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING 
        id, account_number as "accountNumber", account_type as "accountType",
        currency, balance, available_balance as "availableBalance", status,
        third_bank_credential_id as "thirdBankCredentialId",
        created_at as "createdAt", updated_at as "updatedAt"
    `, [accountNumber, accountType, currency, balance, availableBalance, thirdBankCredentialId]);

    return result.rows[0];
  }

  /**
   * Asociar un usuario a una cuenta
   */
  async associateUserToAccount(
    userId: number,
    accountId: number,
    role: 'owner' | 'co-owner' | 'viewer' = 'owner',
    isPrimary: boolean = false
  ): Promise<void> {
    await query(`
      INSERT INTO user_accounts (user_id, account_id, role, is_primary)
      VALUES ($1, $2, $3, $4)
    `, [userId, accountId, role, isPrimary]);
  }

  /**
   * Obtener estadísticas de recaudaciones de una cuenta
   */
  async getAccountStats(accountId: number): Promise<AccountStats> {
    // Obtener información completa de la cuenta
    const accountResult = await query(`
      SELECT 
        id,
        account_number as "accountNumber",
        account_type as "accountType",
        currency,
        balance,
        available_balance as "availableBalance",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM accounts 
      WHERE id = $1 AND deleted_at IS NULL
    `, [accountId]);

    if (accountResult.rowCount === 0) {
      throw new Error('Cuenta no encontrada');
    }

    const account = accountResult.rows[0];

    // Obtener recaudaciones de hoy
    const todayResult = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM account_movements 
          WHERE account_id = $1 
            AND movement_type = 'qr_payment' 
            AND DATE(created_at) = DATE(CURRENT_DATE - INTERVAL '1 day')
            AND deleted_at IS NULL
        ) as yesterday_total
      FROM account_movements 
      WHERE account_id = $1 
        AND movement_type = 'qr_payment' 
        AND DATE(created_at) = CURRENT_DATE
        AND deleted_at IS NULL
    `, [accountId]);

    // Obtener recaudaciones de esta semana
    const thisWeekResult = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM account_movements 
          WHERE account_id = $1 
            AND movement_type = 'qr_payment' 
            AND created_at >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
            AND created_at < DATE_TRUNC('week', CURRENT_DATE)
            AND deleted_at IS NULL
        ) as last_week_total
      FROM account_movements 
      WHERE account_id = $1 
        AND movement_type = 'qr_payment' 
        AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
        AND deleted_at IS NULL
    `, [accountId]);

    // Obtener recaudaciones de este mes
    const thisMonthResult = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM account_movements 
          WHERE account_id = $1 
            AND movement_type = 'qr_payment' 
            AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            AND created_at < DATE_TRUNC('month', CURRENT_DATE)
            AND deleted_at IS NULL
        ) as last_month_total
      FROM account_movements 
      WHERE account_id = $1 
        AND movement_type = 'qr_payment' 
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        AND deleted_at IS NULL
    `, [accountId]);

    // Calcular porcentajes de crecimiento
    const todayData = todayResult.rows[0];
    const thisWeekData = thisWeekResult.rows[0];
    const thisMonthData = thisMonthResult.rows[0];

    const todayGrowth = this.calculateGrowthPercentage(
      parseFloat(todayData.yesterday_total), 
      parseFloat(todayData.total)
    );

    const thisWeekGrowth = this.calculateGrowthPercentage(
      parseFloat(thisWeekData.last_week_total), 
      parseFloat(thisWeekData.total)
    );

    const thisMonthGrowth = this.calculateGrowthPercentage(
      parseFloat(thisMonthData.last_month_total), 
      parseFloat(thisMonthData.total)
    );

    // Obtener los últimos 10 movimientos de la cuenta
    const recentMovementsResult = await query(`
      SELECT 
        am.id,
        am.account_id as "accountId",
        am.movement_type as "movementType",
        am.amount,
        am.description,
        am.reference,
        am.created_at as "createdAt",
        am.updated_at as "updatedAt"
      FROM account_movements am
      WHERE am.account_id = $1 
        AND am.deleted_at IS NULL
      ORDER BY am.created_at DESC
      LIMIT 10
    `, [accountId]);

    const recentMovements = recentMovementsResult.rows.map(row => ({
      id: row.id,
      accountId: row.accountId,
      movementType: row.movementType,
      amount: parseFloat(row.amount),
      description: row.description,
      reference: row.reference,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        balance: parseFloat(account.balance),
        availableBalance: parseFloat(account.availableBalance),
        status: account.status
      },
      today: {
        amount: parseFloat(todayData.total),
        growthPercentage: todayGrowth
      },
      thisWeek: {
        amount: parseFloat(thisWeekData.total),
        growthPercentage: thisWeekGrowth
      },
      thisMonth: {
        amount: parseFloat(thisMonthData.total),
        growthPercentage: thisMonthGrowth
      },
      recentMovements
    };
  }

  /**
   * Calcular porcentaje de crecimiento
   */
  private calculateGrowthPercentage(previousAmount: number, currentAmount: number): number {
    if (previousAmount === 0) {
      return currentAmount > 0 ? 100 : 0;
    }
    return Math.round(((currentAmount - previousAmount) / previousAmount) * 100 * 10) / 10;
  }
}

export default new AccountService();