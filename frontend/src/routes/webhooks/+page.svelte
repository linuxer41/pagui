<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import { Webhook, Plus, Trash2 } from '@lucide/svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Section from '$lib/components/Section.svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import GhostButton from '$lib/components/ui/GhostButton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let webhooks: any[] = [];
  let loading = true;
  let showForm = false;
  let url = ''; let secret = ''; let events = '';
  let saving = false; let error = '';

  const eventOptions = ['transfer.created', 'transfer.completed', 'transfer.failed', 'wallet.topup', 'fraud.alert'];

  onMount(async () => {
    try {
      const res: any = await api.listWebhooks();
      if (res.success) webhooks = res.data?.data || [];
    } catch {}
    finally { loading = false; }
  });

  async function handleCreate() {
    if (!url) { error = 'URL requerida'; return; }
    saving = true; error = '';
    try {
      const eventList = events ? events.split(',').map(e => e.trim()).filter(Boolean) : eventOptions;
      const res: any = await api.registerWebhook({ url, secret: secret || undefined, events: eventList });
      if (res && res.success !== false) {
        webhooks = [{ id: res.data?.id ?? res.id, url, events: eventList, is_active: true }, ...webhooks];
        showForm = false; url = ''; secret = ''; events = '';
      } else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { saving = false; }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteWebhook(id);
      webhooks = webhooks.filter(w => w.id !== id);
    } catch {}
  }
</script>

<PageLayout title="Webhooks">
  <PillButton label="Nuevo" onClick={() => showForm = !showForm} />

  {#if showForm}
    <Section label="Nuevo webhook">
      <div class="form">
        <TextField label="URL del webhook" bind:value={url} placeholder="https://ejemplo.com/webhook" />
        <TextField label="Secret (HMAC)" bind:value={secret} placeholder="Opcional" />
        <TextField label="Eventos (separados por coma)" bind:value={events} placeholder="transfer.completed, fraud.alert" />
        <div class="event-hint">Disponibles: {eventOptions.join(', ')}</div>
        {#if error}<div class="msg error">{error}</div>{/if}
        <div class="form-actions">
          <GhostButton onClick={() => showForm = false}>Cancelar</GhostButton>
          <PillButton label="Crear" onClick={handleCreate} loading={saving} />
        </div>
      </div>
    </Section>
  {/if}

  {#if loading}
    <Skeleton width="100%" height="80px" radius="md" count={3} gap="space-2" />
  {:else if webhooks.length === 0}
    <EmptyState icon={Webhook} title="No hay webhooks registrados" />
  {:else}
    <div class="wh-list">
      {#each webhooks as w}
        <div class="wh-card">
          <div class="wh-body">
            <div class="wh-url">{w.url}</div>
            <div class="wh-events">
              {#each w.events as e}<span class="badge-tag">{e}</span>{/each}
            </div>
            <span class="wh-status">{w.is_active ? 'Activo' : 'Inactivo'}</span>
          </div>
          <button class="wh-delete" onclick={() => handleDelete(w.id)} aria-label="Eliminar"><Trash2 size={16} /></button>
        </div>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .event-hint { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 0.7); margin-top: calc(-1 * var(--space-2)); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .form-actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
  .wh-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .wh-card { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .wh-body { flex: 1; min-width: 0; }
  .wh-url { font-weight: 600; font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); word-break: break-all; }
  .wh-events { display: flex; flex-wrap: wrap; gap: var(--space-1); margin: var(--space-2) 0; }
  .badge-tag { font-size: 0.65rem; background: rgba(var(--primary-rgb), 0.15); color: var(--primary); padding: 0.1rem 0.4rem; border-radius: 4px; }
  .wh-status { font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
  .wh-delete { background: none; border: none; color: rgba(var(--error-rgb), 1); cursor: pointer; padding: var(--space-2); flex-shrink: 0; }
</style>
