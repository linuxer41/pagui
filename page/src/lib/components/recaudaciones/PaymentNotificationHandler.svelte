<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  export let qrId: string;
  export let onPaymentSuccess: (data: any) => void;
  export let onPaymentError: (error: string) => void;
  export let onPaymentStatusChange: (status: string) => void;
  
  let eventSource: EventSource | null = null;
  let isConnected = false;
  let lastStatus = '';
  
  onMount(() => {
    if (qrId) {
      startSSEConnection();
    }
  });
  
  onDestroy(() => {
    closeSSEConnection();
  });
  
  function startSSEConnection() {
    if (eventSource) {
      closeSSEConnection();
    }
    
    try {
      // Construir URL del endpoint SSE
      const baseUrl = window.location.origin;
      const currentPath = window.location.pathname;
      const empresaSlug = currentPath.split('/')[2]; // /recaudaciones/[slug]/...
      
      const sseUrl = `${baseUrl}/recaudaciones/${empresaSlug}/notificaciones?qrId=${qrId}`;
      
      console.log('Conectando a SSE:', sseUrl);
      
      eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        console.log('Conexión SSE establecida');
        isConnected = true;
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Notificación SSE recibida:', data);
          
          handleNotification(data);
        } catch (error) {
          console.error('Error parseando notificación SSE:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('Error en conexión SSE:', error);
        isConnected = false;
        
        // Reintentar conexión después de 5 segundos
        setTimeout(() => {
          if (qrId) {
            startSSEConnection();
          }
        }, 5000);
      };
      
    } catch (error) {
      console.error('Error iniciando conexión SSE:', error);
      onPaymentError('Error conectando a notificaciones en tiempo real');
    }
  }
  
  function handleNotification(data: any) {
    if (data.type === 'connected') {
      console.log('Conectado a notificaciones para QR:', data.qrId);
      return;
    }
    
    if (data.status) {
      lastStatus = data.status;
      onPaymentStatusChange(data.status);
      
      switch (data.status) {
        case 'paid':
          console.log('Pago confirmado!');
          onPaymentSuccess(data);
          break;
          
        case 'failed':
          console.log('Pago falló');
          onPaymentError('El pago no pudo ser procesado');
          break;
          
        case 'expired':
          console.log('QR expirado');
          onPaymentError('El QR ha expirado');
          break;
          
        case 'pending':
          console.log('Pago pendiente...');
          break;
          
        default:
          console.log('Estado desconocido:', data.status);
      }
    }
  }
  
  function closeSSEConnection() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      isConnected = false;
      console.log('Conexión SSE cerrada');
    }
  }
  
  // Función para reconectar manualmente
  export function reconnect() {
    if (qrId) {
      startSSEConnection();
    }
  }
  
  // Función para cambiar el QR ID
  export function updateQrId(newQrId: string) {
    qrId = newQrId;
    if (newQrId) {
      startSSEConnection();
    } else {
      closeSSEConnection();
    }
  }
</script>

<!-- Componente invisible que solo maneja la lógica -->
<div class="payment-notification-handler" style="display: none;">
  <!-- Indicador de conexión para debugging -->
  {#if isConnected}
    <div class="connection-indicator connected">●</div>
  {:else}
    <div class="connection-indicator disconnected">●</div>
  {/if}
</div>

<style>
  .payment-notification-handler {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
  }
  
  .connection-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }
  
  .connection-indicator.connected {
    background-color: #10b981;
  }
  
  .connection-indicator.disconnected {
    background-color: #ef4444;
  }
</style>
