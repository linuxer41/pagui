import { writable, derived } from 'svelte/store';
import { auth } from '$lib/stores/auth';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { API_URL } from '$lib/config';

// Tipos de eventos SSE
export interface SSEEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

// Tipos específicos de eventos
export interface QRPaymentEvent {
  qrId: string;
  transactionId: string;
  amount: number;
  currency: string;
  senderName: string;
  senderDocumentId: string;
  senderAccount: string;
  senderBankCode: string;
  description: string;
  paymentDate: string;
  paymentTime: string;
  singleUse: boolean;
  newStatus: string;
}

export interface WalletBalanceUpdateEvent {
  walletId: number;
  movementType: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  previousAvailableBalance: number;
  newAvailableBalance: number;
  description: string;
  qrId?: string;
  transactionId?: string;
  currency: string;
}

export interface QRStatusChangeEvent {
  qrId: string;
  previousStatus: string;
  newStatus: string;
  amount: number;
  currency: string;
  description: string;
  singleUse: boolean;
  dueDate: string;
  syncSource: string;
}

// Store para el estado de la conexión SSE
export const sseConnection = writable<{
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: SSEEvent | null;
  connectionId: string | null;
}>({
  isConnected: false,
  isConnecting: false,
  error: null,
  lastEvent: null,
  connectionId: null
});

// Store para eventos específicos
export const qrPaymentEvents = writable<QRPaymentEvent[]>([]);
export const balanceUpdateEvents = writable<WalletBalanceUpdateEvent[]>([]);
export const qrStatusChangeEvents = writable<QRStatusChangeEvent[]>([]);

// Store para notificaciones
export const notifications = writable<{
  id: string;
  type: 'payment' | 'balance' | 'qr_status';
  title: string;
  message: string;
  data: any;
  timestamp: string;
  read: boolean;
}[]>([]);

// Store derivado para el último pago recibido
export const lastPayment = derived(
  qrPaymentEvents,
  ($qrPaymentEvents) => $qrPaymentEvents[0] || null
);

// Store derivado para el último balance actualizado
export const lastBalanceUpdate = derived(
  balanceUpdateEvents,
  ($balanceUpdateEvents) => $balanceUpdateEvents[0] || null
);

class SSEService {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: number | null = null;
  private lastHeartbeat: number = 0;
  private connecting = false;

  constructor() {
    auth.subscribe((user) => {
      if (user && user.token) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.lastHeartbeat = 0;
    if (this.eventSource) {
      const es = this.eventSource;
      es.onopen = null;
      es.onerror = null;
      es.close();
      this.eventSource = null;
    }
  }

  async connect(): Promise<void> {
    if (!browser || this.connecting) return;

    const authStore = get(auth);
    if (!authStore?.token) {
      sseConnection.update(state => ({ ...state, isConnecting: false, error: 'No hay token de autenticación' }));
      return;
    }

    this.cleanup();
    this.connecting = true;

    sseConnection.update(state => ({ ...state, isConnecting: true, error: null }));

    try {
      const url = `${API_URL}/events/stream?token=${authStore.token}`;
      this.eventSource = new EventSource(url);
      this.setupEventListeners();
      this.startHeartbeatMonitor();
    } catch (error) {
      this.connecting = false;
      sseConnection.update(state => ({ ...state, isConnecting: false, error: 'Error de conexión' }));
    }
  }

  private setupEventListeners(): void {
    const es = this.eventSource;
    if (!es) return;

    es.addEventListener('connection', (event) => {
      const data = JSON.parse(event.data);
      this.connecting = false;
      this.reconnectAttempts = 0;
      sseConnection.update(state => ({
        ...state, isConnected: true, isConnecting: false, error: null, connectionId: data.connectionId
      }));
    });

    es.addEventListener('heartbeat', () => {
      this.lastHeartbeat = Date.now();
    });

    es.addEventListener('qr_payment', (event) => {
      const data = JSON.parse(event.data) as QRPaymentEvent;
      qrPaymentEvents.update(events => [data, ...events.slice(0, 9)]);
      if (!this.isOnQRStatusPage()) {
        this.addNotification({
          id: `payment_${data.transactionId}_${Date.now()}`,
          type: 'payment', title: 'Pago Recibido',
          message: `Has recibido ${data.currency} ${data.amount.toFixed(2)} de ${data.senderName}`,
          data, timestamp: new Date().toISOString(), read: false
        });
      }
      this.emitCustomEvent('qr_payment', data);
    });

    es.addEventListener('wallet_balance_update', (event) => {
      const data = JSON.parse(event.data) as WalletBalanceUpdateEvent;
      balanceUpdateEvents.update(events => [data, ...events.slice(0, 9)]);
      this.emitCustomEvent('wallet_balance_update', data);
    });

    es.addEventListener('qr_status_change', (event) => {
      const data = JSON.parse(event.data) as QRStatusChangeEvent;
      qrStatusChangeEvents.update(events => [data, ...events.slice(0, 9)]);
      this.emitCustomEvent('qr_status_change', data);
    });

    es.addEventListener('qr_created', (event) => {
      const data = JSON.parse(event.data);
      this.emitCustomEvent('qr_created', data);
    });

    es.addEventListener('notification', (event) => {
      const data = JSON.parse(event.data);
      this.addNotification({
        id: data.id,
        type: data.type === 'balance' ? 'balance' : 'payment',
        title: data.title,
        message: data.message,
        data: data.data,
        timestamp: data.timestamp,
        read: data.read,
      });
      this.emitCustomEvent('notification', data);
    });

    // Error handler: EventSource ya reintenta automáticamente en CONNECTING.
    // Solo intervenimos cuando CLOSED (EventSource ya se rindió).
    es.onerror = () => {
      this.connecting = false;
      if (es.readyState === EventSource.CLOSED) {
        sseConnection.update(state => ({
          ...state, isConnected: false, isConnecting: false, error: 'Conexión perdida'
        }));
        this.scheduleReconnect();
      }
    };
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.lastHeartbeat > 0 && Date.now() - this.lastHeartbeat > 60000) {
        this.scheduleReconnect();
      }
    }, 30000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    setTimeout(() => { this.cleanup(); this.connect(); }, this.reconnectDelay);
  }

  private addNotification(notification: any): void {
    notifications.update(n => [notification, ...n.slice(0, 19)]);
  }

  private isOnQRStatusPage(): boolean {
    return browser && window.location.pathname.startsWith('/qr/status');
  }

  private emitCustomEvent(type: string, data: any): void {
    if (!browser) return;
    window.dispatchEvent(new CustomEvent(`sse:${type}`, { detail: data }));
  }

  disconnect(): void {
    this.cleanup();
    this.connecting = false;
    this.reconnectAttempts = 0;
    sseConnection.update(state => ({
      ...state, isConnected: false, isConnecting: false, connectionId: null, error: null
    }));
  }

  // Método para marcar notificación como leída
  markNotificationAsRead(notificationId: string): void {
    notifications.update(notifications => 
      notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }

  // Método para limpiar notificaciones leídas
  clearReadNotifications(): void {
    notifications.update(notifications => 
      notifications.filter(notification => !notification.read)
    );
  }

  // Método para obtener estadísticas de conexión
  getConnectionStats() {
    const sseConnectionStore = get(sseConnection);
    return {
      isConnected: sseConnectionStore.isConnected,
      isConnecting: sseConnectionStore.isConnecting,
      error: sseConnectionStore.error,
      connectionId: sseConnectionStore.connectionId,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Método para resetear intentos de reconexión
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

// Crear instancia global del servicio
export const sseService = new SSEService();

// Exportar función para escuchar eventos personalizados
export function onSSEEvent(eventType: string, callback: (data: any) => void): () => void {
  if (!browser) return () => {};
  
  const handler = (event: CustomEvent) => {
    callback(event.detail);
  };
  
  window.addEventListener(`sse:${eventType}`, handler as EventListener);
  
  // Retornar función para remover el listener
  return () => {
    window.removeEventListener(`sse:${eventType}`, handler as EventListener);
  };
}

  // Exportar función para reconectar manualmente
export function reconnectSSE(): void {
  console.log('Manual reconnection requested');
  
  // Actualizar estado a conectando
  sseConnection.update(state => ({
    ...state,
    isConnecting: true,
    error: null
  }));
  
  // Desconectar primero
  sseService.disconnect();
  
  // Resetear contador de intentos para reconexión manual
  sseService.resetReconnectAttempts();
  
  // Reconectar después de un breve delay
  setTimeout(() => {
    console.log('Attempting manual reconnection...');
    sseService.connect();
  }, 1000);
}
