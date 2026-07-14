<script lang="ts">
  import { onMount } from 'svelte';
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

<div class="page-header">
  <span class="page-header-title">Notificaciones</span>
  <div class="page-header-actions">
    {#if unreadCount > 0}
      <button onclick={markAllRead} aria-label="Marcar todas como leídas" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:none;background:var(--surface);border-radius:var(--radius-full);color:var(--primary-color);box-shadow:var(--shadow-xs);cursor:pointer;transition:all var(--duration-fast) var(--ease-out)">
        <CheckCheck size={18} />
      </button>
    {/if}
  </div>
</div>

<div class="page-content" style="padding-top:var(--space-4)">
  {#if loading}
    <div style="text-align:center;padding:2rem;color:var(--text-secondary)">Cargando...</div>
  {:else if notifications.length === 0}
    <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4);padding:3rem 1rem;color:var(--text-secondary)">
      <BellOff size={48} />
      <p style="margin:0;font-size:var(--text-sm)">No hay notificaciones</p>
    </div>
  {:else}
    <div class="section-card" style="display:flex;flex-direction:column;padding:var(--space-2)">
      {#each notifications as n}
        <button onclick={() => !n.is_read && markRead(n.id)} style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);background:transparent;border:none;border-bottom:1px solid var(--border);cursor:pointer;text-align:left;width:100%;transition:background var(--duration-fast) var(--ease-out)">
          <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:0.4rem;background:{n.is_read ? 'transparent' : 'var(--primary-color)'}"></div>
          <div style="flex:1;min-width:0">
            <p style="margin:0 0 var(--space-1);font-size:var(--text-sm);color:var(--text-primary);{!n.is_read ? 'font-weight:600' : ''}">{n.message || n.title || 'Notificación'}</p>
            <span style="font-size:var(--text-xs);color:var(--text-secondary)">{new Date(n.created_at || n.date).toLocaleDateString('es-BO')}</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
