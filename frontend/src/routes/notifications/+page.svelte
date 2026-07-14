<script lang="ts">
  import { onMount } from 'svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Button from '$lib/components/Button.svelte';
  import api from '$lib/api';
  import { Bell, BellOff, CheckCheck, ArrowLeft } from '@lucide/svelte';

  let notifications: any[] = [];
  let loading = true;
  let unreadCount = 0;

  onMount(async () => {
    await load();
  });

  async function load() {
    loading = true;
    try {
      const [notifRes, unreadRes] = await Promise.all([
        api.listNotifications(),
        api.getUnreadNotificationCount()
      ]);
      if (notifRes.success) notifications = notifRes.data || [];
      if (unreadRes.success) unreadCount = unreadRes.data?.count || 0;
    } catch {}
    finally { loading = false; }
  }

  async function markRead(id: string) {
    try {
      await api.markNotificationRead(id);
      notifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
      unreadCount = Math.max(0, unreadCount - 1);
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      notifications = notifications.map(n => ({ ...n, is_read: true }));
      unreadCount = 0;
    } catch {}
  }
</script>

<RouteLayout title="Notificaciones">
  <div slot="right">
    {#if unreadCount > 0}
      <button class="mark-all" on:click={markAllRead} aria-label="Marcar todas como leídas">
        <CheckCheck size={18} />
      </button>
    {/if}
  </div>

  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if notifications.length === 0}
    <div class="empty">
      <BellOff size={48} />
      <p>No hay notificaciones</p>
    </div>
  {:else}
    <div class="list">
      {#each notifications as n}
        <button class="card" class:unread={!n.is_read} on:click={() => !n.is_read && markRead(n.id)}>
          <div class="dot" class:unread={!n.is_read}></div>
          <div class="info">
            <p class="msg">{n.message || n.title || 'Notificación'}</p>
            <span class="date">{new Date(n.created_at || n.date).toLocaleDateString('es-BO')}</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .mark-all { background: none; border: none; color: var(--primary); cursor: pointer; padding: 0.25rem; }
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; color: var(--text-secondary); }
  .list { display: flex; flex-direction: column; gap: 0.25rem; }
  .card { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 0.75rem; background: transparent; border: none; border-bottom: 1px solid var(--border); cursor: pointer; text-align: left; width: 100%; }
  .card.unread { background: rgba(33, 150, 243, 0.05); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: transparent; flex-shrink: 0; margin-top: 0.4rem; }
  .dot.unread { background: var(--primary); }
  .info { flex: 1; }
  .msg { margin: 0; font-size: 0.9rem; color: var(--text-primary); }
  .card.unread .msg { font-weight: 600; }
  .date { font-size: 0.75rem; color: var(--text-secondary); }
</style>
