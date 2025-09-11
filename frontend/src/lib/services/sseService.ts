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

export interface AccountBalanceUpdateEvent {
  accountId: number;
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
export const balanceUpdateEvents = writable<AccountBalanceUpdateEvent[]>([]);
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
  private reconnectDelay = 5000; // 5 segundos
  private heartbeatInterval: number | null = null;
  private lastHeartbeat: number = 0;

  constructor() {
    // Inicializar cuando el usuario esté autenticado
    auth.subscribe((user) => {
      if (user && user.token) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  async connect(): Promise<void> {
    if (!browser) return;
    
    const authStore = get(auth);
    if (!authStore?.token) {
      console.warn('No API key available for SSE connection');
      sseConnection.update(state => ({
        ...state,
        isConnecting: false,
        error: 'No hay token de autenticación'
      }));
      return;
    }

    // Evitar múltiples conexiones
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      console.log('SSE already connected, skipping');
      return;
    }

    console.log('Connecting to SSE...');
    sseConnection.update(state => ({
      ...state,
      isConnecting: true,
      error: null
    }));

    try {
      const url = `${API_URL}/events/stream?token=${authStore.token}`;
      console.log('SSE URL:', url);
      this.eventSource = new EventSource(url);

      this.setupEventListeners();
      this.startHeartbeatMonitor();

    } catch (error) {
      console.error('Error connecting to SSE:', error);
      sseConnection.update(state => ({
        ...state,
        isConnecting: false,
        error: 'Error de conexión'
      }));
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Evento de conexión exitosa
    this.eventSource.addEventListener('connection', (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE Connected:', data);
      
      sseConnection.update(state => ({
        ...state,
        isConnected: true,
        isConnecting: false,
        error: null,
        connectionId: data.connectionId
      }));

      this.reconnectAttempts = 0;
    });

    // Evento de heartbeat
    this.eventSource.addEventListener('heartbeat', (event) => {
      const data = JSON.parse(event.data);
      this.lastHeartbeat = Date.now();
      console.log('SSE Heartbeat:', data.timestamp);
    });

    // Evento de pago QR
    this.eventSource.addEventListener('qr_payment', (event) => {
      const data = JSON.parse(event.data) as QRPaymentEvent;
      console.log('QR Payment received:', data);
      
      // Actualizar store de eventos de pago
      qrPaymentEvents.update(events => [data, ...events.slice(0, 9)]); // Mantener últimos 10
      
      // Solo agregar notificación si no estamos en la página de estado del QR
      // La página de estado del QR maneja el pago con su propio modal
      if (!this.isOnQRStatusPage()) {
        this.addNotification({
          id: `payment_${data.transactionId}_${Date.now()}`,
          type: 'payment',
          title: 'Pago Recibido',
          message: `Has recibido ${data.currency} ${data.amount.toFixed(2)} de ${data.senderName}`,
          data,
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      // Emitir evento personalizado para que las páginas puedan reaccionar
      this.emitCustomEvent('qr_payment', data);
    });

    // Evento de actualización de balance
    this.eventSource.addEventListener('account_balance_update', (event) => {
      const data = JSON.parse(event.data) as AccountBalanceUpdateEvent;
      console.log('Balance updated:', data);
      
      // Actualizar store de eventos de balance
      balanceUpdateEvents.update(events => [data, ...events.slice(0, 9)]); // Mantener últimos 10
      
      // Emitir evento personalizado
      this.emitCustomEvent('account_balance_update', data);
    });

    // Evento de cambio de estado de QR
    this.eventSource.addEventListener('qr_status_change', (event) => {
      const data = JSON.parse(event.data) as QRStatusChangeEvent;
      console.log('QR Status changed:', data);
      
      // Actualizar store de eventos de cambio de estado
      qrStatusChangeEvents.update(events => [data, ...events.slice(0, 9)]); // Mantener últimos 10
      
      // Emitir evento personalizado
      this.emitCustomEvent('qr_status_change', data);
    });

    // Evento de QR creado
    this.eventSource.addEventListener('qr_created', (event) => {
      const data = JSON.parse(event.data);
      console.log('QR Created:', data);
      
      // Emitir evento personalizado
      this.emitCustomEvent('qr_created', data);
    });

    // Manejo de errores
    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      
      // Verificar el estado de la conexión para determinar el tipo de error
      if (this.eventSource) {
        const readyState = this.eventSource.readyState;
        
        if (readyState === EventSource.CLOSED) {
          // Conexión cerrada - podría ser error del servidor o 401
          console.log('SSE Connection closed, checking for server errors...');
          
          // No reintentar automáticamente para errores del servidor
          sseConnection.update(state => ({
            ...state,
            isConnected: false,
            isConnecting: false,
            error: 'Conexión cerrada por el servidor'
          }));
          
          // No llamar handleReconnection() para errores del servidor
          return;
        }
      }
      
      // Solo reintentar para errores de red/conexión
      sseConnection.update(state => ({
        ...state,
        isConnected: false,
        isConnecting: false,
        error: 'Error de conexión'
      }));

      this.handleReconnection();
    };

    // Manejo de cierre de conexión
    this.eventSource.close = () => {
      console.log('SSE Connection closed');
      
      sseConnection.update(state => ({
        ...state,
        isConnected: false,
        isConnecting: false
      }));

      this.handleReconnection();
    };
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = window.setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;
      
      // Si no hay heartbeat en 60 segundos, reconectar
      if (timeSinceLastHeartbeat > 60000 && this.lastHeartbeat > 0) {
        console.warn('No heartbeat received, reconnecting...');
        this.handleReconnection();
      }
    }, 30000); // Verificar cada 30 segundos
  }

  private handleReconnection(): void {
    // Verificar si el error es del servidor (401, 500, etc.) - no reintentar
    if (this.isServerError()) {
      console.log('Server error detected, not attempting reconnection');
      sseConnection.update(state => ({
        ...state,
        error: 'Error del servidor. Verifica tu autenticación.'
      }));
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      sseConnection.update(state => ({
        ...state,
        error: 'No se pudo reconectar. Intenta recargar la página.'
      }));
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
    
    setTimeout(() => {
      this.disconnect();
      this.connect();
    }, this.reconnectDelay);
  }

  // Verificar si el error es del servidor (no de red)
  private isServerError(): boolean {
    if (!this.eventSource) return false;
    
    const readyState = this.eventSource.readyState;
    
    // EventSource.CLOSED indica que el servidor cerró la conexión
    // Esto puede ser por 401 (no autorizado) u otros errores del servidor
    if (readyState === EventSource.CLOSED) {
      return true;
    }
    
    // También verificar si hay un error HTTP específico
    // (aunque EventSource no expone directamente el código de estado)
    return false;
  }

  private addNotification(notification: any): void {
    notifications.update(notifications => {
      // Agregar al inicio y mantener máximo 20 notificaciones
      return [notification, ...notifications.slice(0, 19)];
    });
  }

  private isOnQRStatusPage(): boolean {
    if (!browser) return false;
    return window.location.pathname.startsWith('/qr/status');
  }

  private emitCustomEvent(type: string, data: any): void {
    if (!browser) return;
    
    const event = new CustomEvent(`sse:${type}`, {
      detail: data
    });
    window.dispatchEvent(event);
  }

  disconnect(): void {
    console.log('Disconnecting SSE...');
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    sseConnection.update(state => ({
      ...state,
      isConnected: false,
      isConnecting: false,
      connectionId: null,
      error: null
    }));

    this.reconnectAttempts = 0;
    this.lastHeartbeat = 0;
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
