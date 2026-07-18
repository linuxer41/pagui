<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { Mail, BadgeInfo, Calendar, Shield } from '@lucide/svelte';

  let user = $derived($auth.user);
  let role = $derived($auth.wallets?.[0]?.userRole || 'Usuario');
</script>

<PageLayout title="Detalles de cuenta">
  <div class="list">
    <div class="row">
      <div class="row-icon"><Mail size={18} /></div>
      <div class="row-text"><span class="row-label">Correo</span><span class="row-value">{user?.email || '—'}</span></div>
    </div>
    <div class="row">
      <div class="row-icon"><BadgeInfo size={18} /></div>
      <div class="row-text"><span class="row-label">Estado</span><span class="row-value status">{user?.status || 'active'}</span></div>
    </div>
    <div class="row">
      <div class="row-icon"><Shield size={18} /></div>
      <div class="row-text"><span class="row-label">Rol</span><span class="row-value">{role}</span></div>
    </div>
    <div class="row">
      <div class="row-icon"><Calendar size={18} /></div>
      <div class="row-text"><span class="row-label">Miembro desde</span><span class="row-value">2023</span></div>
    </div>
  </div>
</PageLayout>

<style>
  .list { display: flex; flex-direction: column; padding: var(--space-4); }
  .row { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-3) 0; }
  .row + .row { border-top: 1px solid rgba(var(--border-rgb), 0.2); }
  .row-icon { width: 40px; height: 40px; border-radius: var(--radius-lg); background: rgba(var(--primary-rgb), 0.08); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .row-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .row-label { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .row-value { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .row-value.status { color: rgba(var(--success-rgb), 1); }
</style>
