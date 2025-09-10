<script lang="ts">
  import { notifications, sseService, sseConnection, reconnectSSE } from '$lib/services/sseService';
  import { CheckCircle, X, Bell, Wifi, WifiOff } from '@lucide/svelte';
  import { fly, fade } from 'svelte/transition';
  import { onMount } from 'svelte';

  let showNotifications = false;
  let unreadCount = 0;
  let showConnectionStatus = false;

  // Contar notificaciones no leídas
  $: unreadCount = $notifications.filter(n => !n.read).length;
  
  // Mostrar estado de conexión si hay error
  $: showConnectionStatus = $sseConnection.error && !$sseConnection.isConnected;

  // Mostrar notificación automáticamente cuando llega una nueva
  $: if ($notifications.length > 0 && !$notifications[0].read) {
    // La notificación más reciente se muestra automáticamente
    setTimeout(() => {
      if ($notifications[0] && !$notifications[0].read) {
        showNotifications = true;
      }
    }, 100);
  }

  function markAsRead(notificationId: string) {
    sseService.markNotificationAsRead(notificationId);
  }

  function clearAllRead() {
    sseService.clearReadNotifications();
  }

  function handleReconnect() {
    reconnectSSE();
  }

  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Menos de 1 minuto
      return 'Ahora';
    } else if (diff < 3600000) { // Menos de 1 hora
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes}m`;
    } else if (diff < 86400000) { // Menos de 1 día
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours}h`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'payment':
        return CheckCircle;
      case 'balance':
        return Bell;
      case 'qr_status':
        return CheckCircle;
      default:
        return Bell;
    }
  }

  function getNotificationColor(type: string): string {
    switch (type) {
      case 'payment':
        return 'success';
      case 'balance':
        return 'info';
      case 'qr_status':
        return 'warning';
      default:
        return 'default';
    }
  }
</script>

<!-- Toast de notificación individual -->
{#each $notifications.slice(0, 1) as notification (notification.id)}
  {#if !notification.read}
    <div 
      class="notification-toast notification-{getNotificationColor(notification.type)}"
      in:fly={{ y: -100, duration: 300 }}
      out:fly={{ y: -100, duration: 300 }}
      role="alert"
      aria-live="polite"
    >
      <div class="notification-content">
        <div class="notification-icon">
          <svelte:component this={getNotificationIcon(notification.type)} size={20} />
        </div>
        <div class="notification-text">
          <div class="notification-title">{notification.title}</div>
          <div class="notification-message">{notification.message}</div>
          <div class="notification-time">{formatTime(notification.timestamp)}</div>
        </div>
        <button 
          class="notification-close"
          on:click={() => markAsRead(notification.id)}
          aria-label="Cerrar notificación"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  {/if}
{/each}

<!-- Panel de notificaciones (opcional, se puede activar con un botón) -->
{#if showNotifications}
  <div class="notifications-panel" in:fade={{ duration: 200 }}>
    <div class="notifications-header">
      <h3>Notificaciones</h3>
      <div class="notifications-actions">
        {#if unreadCount > 0}
          <button class="clear-button" on:click={clearAllRead}>
            Limpiar leídas
          </button>
        {/if}
        <button class="close-button" on:click={() => showNotifications = false}>
          <X size={16} />
        </button>
      </div>
    </div>
    
    <div class="notifications-list">
      {#each $notifications as notification (notification.id)}
        <div 
          class="notification-item {notification.read ? 'read' : 'unread'}"
          on:click={() => markAsRead(notification.id)}
          on:keydown={(e) => e.key === 'Enter' && markAsRead(notification.id)}
          role="button"
          tabindex="0"
        >
          <div class="notification-icon">
            <svelte:component this={getNotificationIcon(notification.type)} size={16} />
          </div>
          <div class="notification-content">
            <div class="notification-title">{notification.title}</div>
            <div class="notification-message">{notification.message}</div>
            <div class="notification-time">{formatTime(notification.timestamp)}</div>
          </div>
          {#if !notification.read}
            <div class="unread-indicator"></div>
          {/if}
        </div>
      {/each}
      
      {#if $notifications.length === 0}
        <div class="no-notifications">
          <Bell size={32} />
          <p>No hay notificaciones</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Indicador de estado de conexión -->
{#if showConnectionStatus}
  <div class="connection-status" in:fly={{ y: -100, duration: 300 }}>
    <div class="connection-content">
      <div class="connection-icon">
        <WifiOff size={20} />
      </div>
      <div class="connection-text">
        <div class="connection-title">Conexión perdida</div>
        <div class="connection-message">{$sseConnection.error}</div>
      </div>
      <button class="reconnect-button" on:click={handleReconnect}>
        <Wifi size={16} />
        Reconectar
      </button>
    </div>
  </div>
{/if}

<style>
  .notification-toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    max-width: 400px;
    background: var(--surface);
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  .notification-toast.notification-success {
    border-left: 4px solid var(--success-color);
  }

  .notification-toast.notification-info {
    border-left: 4px solid var(--primary-color);
  }

  .notification-toast.notification-warning {
    border-left: 4px solid var(--warning-color);
  }

  .notification-toast.notification-default {
    border-left: 4px solid var(--text-secondary);
  }

  .notification-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }

  .notification-icon {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-secondary);
  }

  .notification-success .notification-icon {
    background: rgba(0, 202, 141, 0.1);
    color: var(--success-color);
  }

  .notification-info .notification-icon {
    background: rgba(0, 168, 204, 0.1);
    color: var(--primary-color);
  }

  .notification-warning .notification-icon {
    background: rgba(255, 175, 0, 0.1);
    color: var(--warning-color);
  }

  .notification-text {
    flex: 1;
    min-width: 0;
  }

  .notification-title {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .notification-message {
    color: var(--text-secondary);
    font-size: 0.8rem;
    line-height: 1.4;
    margin-bottom: 0.25rem;
  }

  .notification-time {
    color: var(--text-secondary);
    font-size: 0.7rem;
    opacity: 0.8;
  }

  .notification-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .notification-close:hover {
    background: var(--background-secondary);
    color: var(--text-primary);
  }

  /* Panel de notificaciones */
  .notifications-panel {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1001;
    width: 350px;
    max-height: 500px;
    background: var(--surface);
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  .notifications-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--background-secondary);
  }

  .notifications-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .notifications-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .clear-button,
  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.8rem;
    transition: all 0.2s ease;
  }

  .clear-button:hover,
  .close-button:hover {
    background: var(--background-primary);
    color: var(--text-primary);
  }

  .notifications-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--border-color);
    position: relative;
  }

  .notification-item:hover {
    background: var(--background-secondary);
  }

  .notification-item.unread {
    background: rgba(0, 202, 141, 0.02);
  }

  .notification-item.read {
    opacity: 0.7;
  }

  .notification-item .notification-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .notification-item .notification-content {
    flex: 1;
    min-width: 0;
  }

  .notification-item .notification-title {
    font-size: 0.8rem;
    margin-bottom: 0.125rem;
  }

  .notification-item .notification-message {
    font-size: 0.75rem;
    margin-bottom: 0.125rem;
  }

  .notification-item .notification-time {
    font-size: 0.7rem;
  }

  .unread-indicator {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: 0.5rem;
    height: 0.5rem;
    background: var(--success-color);
    border-radius: 50%;
  }

  .no-notifications {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--text-secondary);
    text-align: center;
  }

  .no-notifications :global(svg) {
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }

  .no-notifications p {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Indicador de estado de conexión */
  .connection-status {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1002;
    max-width: 400px;
    background: var(--surface);
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--error-color);
    border-left: 4px solid var(--error-color);
    overflow: hidden;
  }

  .connection-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
  }

  .connection-icon {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(233, 58, 74, 0.1);
    color: var(--error-color);
  }

  .connection-text {
    flex: 1;
    min-width: 0;
  }

  .connection-title {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .connection-message {
    color: var(--text-secondary);
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .reconnect-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .reconnect-button:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .reconnect-button:active {
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    .notification-toast,
    .notifications-panel,
    .connection-status {
      right: 0.5rem;
      left: 0.5rem;
      max-width: none;
    }

    .notifications-panel {
      width: auto;
    }

    .connection-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .reconnect-button {
      align-self: stretch;
      justify-content: center;
    }
  }
</style>
