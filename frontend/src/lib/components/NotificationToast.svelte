<script lang="ts">
  import { notifications, sseService } from '$lib/services/sseService';
  import { CheckCircle, X, Bell } from '@lucide/svelte';
  import { fly, fade } from 'svelte/transition';
  import { onMount } from 'svelte';

  let showNotifications = $state(false);
  let unreadCount = $derived($notifications.filter(n => !n.read).length);

  $effect(() => {
    if ($notifications.length > 0 && !$notifications[0].read) {
      setTimeout(() => {
        if ($notifications[0] && !$notifications[0].read) {
          showNotifications = true;
        }
      }, 100);
    }
  });

  function markAsRead(notificationId: string) {
    sseService.markNotificationAsRead(notificationId);
  }
  function clearAllRead() {
    sseService.clearReadNotifications();
  }
  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) { const m = Math.floor(diff / 60000); return `Hace ${m}m`; }
    if (diff < 86400000) { const h = Math.floor(diff / 3600000); return `Hace ${h}h`; }
    return date.toLocaleDateString('es-ES');
  }
  function getNotificationIcon(type: string) {
    switch (type) {
      case 'payment': return CheckCircle;
      case 'balance': return Bell;
      case 'qr_status': return CheckCircle;
      default: return Bell;
    }
  }
  function getNotificationColor(type: string): string {
    switch (type) {
      case 'payment': return 'success';
      case 'balance': return 'info';
      case 'qr_status': return 'warning';
      default: return 'default';
    }
  }
</script>

{#each $notifications.slice(0, 1) as notification (notification.id)}
  {#if !notification.read}
    <div class="notification-toast notification-{getNotificationColor(notification.type)}" in:fly={{ y: -100, duration: 300 }} out:fly={{ y: -100, duration: 300 }} role="alert" aria-live="polite">
      <div class="notification-content">
        {#each [getNotificationIcon(notification.type)] as NotificationIcon}
    <div class="notification-icon"><NotificationIcon size={20} /></div>
    {/each}
        <div class="notification-text">
          <div class="notification-title">{notification.title}</div>
          <div class="notification-message">{notification.message}</div>
          <div class="notification-time">{formatTime(notification.timestamp)}</div>
        </div>
        <button class="notification-close" onclick={() => markAsRead(notification.id)} aria-label="Cerrar notificación"><X size={16} /></button>
      </div>
    </div>
  {/if}
{/each}

{#if showNotifications}
  <div class="notifications-panel" in:fade={{ duration: 200 }}>
    <div class="notifications-header">
      <h3>Notificaciones</h3>
      <div class="notifications-actions">
        {#if unreadCount > 0}<button class="clear-button" onclick={clearAllRead}>Limpiar leídas</button>{/if}
        <button class="close-button" onclick={() => showNotifications = false}><X size={16} /></button>
      </div>
    </div>
    <div class="notifications-list">
      {#each $notifications as notification (notification.id)}
        <div class="notification-item {notification.read ? 'read' : 'unread'}" onclick={() => markAsRead(notification.id)} onkeydown={(e) => e.key === 'Enter' && markAsRead(notification.id)} role="button" tabindex="0">
          {#each [getNotificationIcon(notification.type)] as NotificationIcon}
          <div class="notification-icon"><NotificationIcon size={16} /></div>
          {/each}
          <div class="notification-content">
            <div class="notification-title">{notification.title}</div>
            <div class="notification-message">{notification.message}</div>
            <div class="notification-time">{formatTime(notification.timestamp)}</div>
          </div>
          {#if !notification.read}<div class="unread-indicator"></div>{/if}
        </div>
      {/each}
      {#if $notifications.length === 0}
        <div class="no-notifications"><Bell size={32} /><p>No hay notificaciones</p></div>
      {/if}
    </div>
  </div>
{/if}

