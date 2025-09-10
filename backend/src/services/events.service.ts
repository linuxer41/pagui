import { query } from '../config/database';

export interface ServerEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  accountId: number;
}

export interface EventSubscription {
  accountId: number;
  connectionId: string;
  send: (event: ServerEvent) => void;
  close: () => void;
}

class EventsService {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private accountSubscriptions: Map<number, Set<string>> = new Map();

  /**
   * Autenticar token basado en el tipo especificado
   */
  async authenticateToken(token: string, authType: 'apikey' | 'jwt'): Promise<{ accountId: number; userId: number; authType: 'apikey' | 'jwt' } | null> {
    try {
      if (authType === 'apikey') {
        const apiKeyResult = await this.authenticateApiKey(token);
        if (apiKeyResult) {
          return { ...apiKeyResult, authType: 'apikey' };
        }
      } else if (authType === 'jwt') {
        const jwtResult = await this.authenticateJWT(token);
        if (jwtResult) {
          return { ...jwtResult, authType: 'jwt' };
        }
      }

      return null;
    } catch (error) {
      console.error('Error authenticating token:', error);
      return null;
    }
  }

  /**
   * Autenticar API Key
   */
  private async authenticateApiKey(apiKey: string): Promise<{ accountId: number; userId: number } | null> {
    try {
      const result = await query(`
        SELECT 
          ak.user_id,
          ua.account_id,
          ak.status as token_status
        FROM api_keys ak
        JOIN user_accounts ua ON ak.user_id = ua.user_id
        WHERE ak.api_key = $1 
          AND ak.status = 'active'
          AND ak.deleted_at IS NULL
          AND ua.is_primary = true
      `, [apiKey]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        accountId: row.account_id,
        userId: row.user_id
      };
    } catch (error) {
      console.error('Error authenticating API key:', error);
      return null;
    }
  }

  /**
   * Autenticar JWT Token
   */
  private async authenticateJWT(jwtToken: string): Promise<{ accountId: number; userId: number } | null> {
    try {
      // Importar el servicio de autenticación
      const { authService } = await import('./auth.service');
      
      // Verificar el JWT
      const decoded = await authService.verifyToken(jwtToken);
      if (!decoded) {
        return null;
      }

      // Obtener la cuenta primaria del usuario
      const result = await query(`
        SELECT 
          ua.account_id,
          ua.user_id
        FROM user_accounts ua
        WHERE ua.user_id = $1 
          AND ua.is_primary = true
      `, [decoded.userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        accountId: row.account_id,
        userId: row.user_id
      };
    } catch (error) {
      console.error('Error authenticating JWT:', error);
      return null;
    }
  }

  /**
   * Suscribir una conexión a eventos de una cuenta
   */
  subscribe(accountId: number, connectionId: string, send: (event: ServerEvent) => void, close: () => void): void {
    const subscription: EventSubscription = {
      accountId,
      connectionId,
      send,
      close
    };

    // Agregar a las suscripciones
    this.subscriptions.set(connectionId, subscription);

    // Agregar a las suscripciones por cuenta
    if (!this.accountSubscriptions.has(accountId)) {
      this.accountSubscriptions.set(accountId, new Set());
    }
    this.accountSubscriptions.get(accountId)!.add(connectionId);
  }

  /**
   * Desuscribir una conexión
   */
  unsubscribe(connectionId: string): void {
    const subscription = this.subscriptions.get(connectionId);
    if (!subscription) return;

    const { accountId } = subscription;

    // Remover de las suscripciones
    this.subscriptions.delete(connectionId);

    // Remover de las suscripciones por cuenta
    const accountSubs = this.accountSubscriptions.get(accountId);
    if (accountSubs) {
      accountSubs.delete(connectionId);
      if (accountSubs.size === 0) {
        this.accountSubscriptions.delete(accountId);
      }
    }
  }

  /**
   * Enviar evento a una cuenta específica
   */
  sendToAccount(accountId: number, event: Omit<ServerEvent, 'accountId' | 'timestamp'>): void {
    const accountSubs = this.accountSubscriptions.get(accountId);
    if (!accountSubs || accountSubs.size === 0) {
      return;
    }

    const serverEvent: ServerEvent = {
      ...event,
      accountId,
      timestamp: new Date()
    };

    const failedConnections: string[] = [];

    for (const connectionId of accountSubs) {
      try {
        const subscription = this.subscriptions.get(connectionId);
        if (subscription) {
          subscription.send(serverEvent);
        } else {
          failedConnections.push(connectionId);
        }
      } catch (error) {
        console.error(`Error enviando evento a conexión ${connectionId}:`, error);
        failedConnections.push(connectionId);
      }
    }

    // Limpiar conexiones fallidas
    failedConnections.forEach(connectionId => {
      this.unsubscribe(connectionId);
    });
  }

  /**
   * Enviar evento a todas las cuentas (para eventos del sistema)
   */
  sendToAll(event: Omit<ServerEvent, 'accountId' | 'timestamp'>): void {
    const uniqueAccounts = new Set<number>();
    
    for (const subscription of this.subscriptions.values()) {
      uniqueAccounts.add(subscription.accountId);
    }

    for (const accountId of uniqueAccounts) {
      this.sendToAccount(accountId, event);
    }
  }

  /**
   * Obtener estadísticas de suscripciones
   */
  getStats(): {
    totalConnections: number;
    accountsWithSubscriptions: number;
    subscriptionsByAccount: Record<number, number>;
  } {
    const subscriptionsByAccount: Record<number, number> = {};
    
    for (const [accountId, connections] of this.accountSubscriptions.entries()) {
      subscriptionsByAccount[accountId] = connections.size;
    }

    return {
      totalConnections: this.subscriptions.size,
      accountsWithSubscriptions: this.accountSubscriptions.size,
      subscriptionsByAccount
    };
  }

  /**
   * Limpiar todas las suscripciones (para shutdown)
   */
  closeAll(): void {
    console.log('🛑 Cerrando todas las conexiones SSE...');
    
    for (const subscription of this.subscriptions.values()) {
      try {
        subscription.close();
      } catch (error) {
        console.error('Error cerrando conexión:', error);
      }
    }

    this.subscriptions.clear();
    this.accountSubscriptions.clear();
    
    console.log('✅ Todas las conexiones SSE cerradas');
  }
}

export const eventsService = new EventsService();
export default eventsService;
