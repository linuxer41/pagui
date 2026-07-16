<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import { Bell, BellOff, CheckCheck } from '@lucide/svelte';
import PageLayout from '$lib/components/layouts/PageLayout.svelte';
import Skeleton from '$lib/components/Skeleton.svelte';
import EmptyState from '$lib/components/EmptyState.svelte';

  let notifications: any[] = [];
  let loading = true;
  let unreadCount = 0;

  onMount(async () => { await load(); });

  async function load() {
    loading = true;
    try {
      const [notifRes, unreadRes] = await Promise.all([
        api.listNotifications(),
        api.getUnreadNotificationCount()
      ]);
      if ((notifRes as any).success) notifications = (notifRes as any).data?.data || [];
      if ((unreadRes as any) && (unreadRes as any).success !== false) unreadCount = (unreadRes as any).data?.count ?? (unreadRes as any).count ?? 0;
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

<PageLayout title="Notificaciones">
  {#if unreadCount > 0}
    {#snippet actions()}
      <button class="mark-all-btn" onclick={markAllRead} aria-label="Marcar todas como leídas"><CheckCheck size={18} /></button>
    {/snippet}
  {/if}

  {#if loading}
    <Skeleton width="100%" height="58px" radius="lg" count={3} gap="space-2" />
  {:else if notifications.length === 0}
    <EmptyState icon={BellOff} title="No hay notificaciones" />
  {:else}
    <div class="notif-list">
      {#each notifications as n}
        <button class="notif-item" onclick={() => !n.is_read && markRead(n.id)}>
          <div class="notif-dot" class:unread={!n.is_read}></div>
          <div class="notif-body">
            <p class="notif-message" class:bold={!n.is_read}>{n.message || n.title || 'Notificación'}</p>
            <span class="notif-date">{new Date(n.created_at || n.date).toLocaleDateString('es-BO')}</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .mark-all-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-full); color: var(--primary); cursor: pointer; }
  .mark-all-btn:active { opacity: 0.7; }
  .notif-list { display: flex; flex-direction: column; }
  .notif-item { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3); background: transparent; border: none; border-bottom: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; text-align: left; width: 100%; }
  .notif-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 0.4rem; background: transparent; }
  .notif-dot.unread { background: var(--primary); }
  .notif-body { flex: 1; min-width: 0; }
  .notif-message { margin: 0 0 var(--space-1); font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); font-weight: 400; }
  .notif-message.bold { font-weight: 600; }
  .notif-date { font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
</style>
