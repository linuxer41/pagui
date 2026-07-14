<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import api from '$lib/api';
  import { Webhook, Plus, Trash2 } from '@lucide/svelte';

  let webhooks: any[] = [];
  let loading = true;
  let showForm = false;
  let url = ''; let secret = ''; let events = '';
  let saving = false; let error = '';

  const eventOptions = ['transfer.created', 'transfer.completed', 'transfer.failed', 'wallet.topup', 'fraud.alert'];

  onMount(async () => {
    try {
      const res = await api.listWebhooks();
      if (res.success) webhooks = res.data || [];
    } catch {}
    finally { loading = false; }
  });

  async function handleCreate() {
    if (!url) { error = 'URL requerida'; return; }
    saving = true; error = '';
    try {
      const eventList = events ? events.split(',').map(e => e.trim()).filter(Boolean) : eventOptions;
      const res = await api.registerWebhook({ url, secret: secret || undefined, events: eventList });
      if (res.success) {
        webhooks = [{ id: res.data?.id, url, events: eventList, is_active: true }, ...webhooks];
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

<RouteLayout title="Webhooks">
  <div class="header-actions">
    <Button on:click={() => showForm = !showForm} size="sm"><Plus size={16} /> Nuevo</Button>
  </div>

  {#if showForm}
    <div class="form-card">
      <h3>Nuevo webhook</h3>
      <Input id="url" label="URL del webhook" bind:value={url} placeholder="https://ejemplo.com/webhook" />
      <Input id="sec" label="Secret (HMAC)" bind:value={secret} placeholder="Opcional" />
      <Input id="evt" label="Eventos (separados por coma)" bind:value={events}
        placeholder="transfer.completed, fraud.alert" />
      <small>Disponibles: {eventOptions.join(', ')}</small>
      {#if error}<div class="msg error">{error}</div>{/if}
      <div class="form-actions">
        <Button variant="ghost" on:click={() => showForm = false}>Cancelar</Button>
        <Button on:click={handleCreate} loading={saving}>Crear</Button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="loading">Cargando...</p>
  {:else if webhooks.length === 0}
    <div class="empty">
      <Webhook size={48} />
      <p>No hay webhooks registrados</p>
    </div>
  {:else}
    <div class="list">
      {#each webhooks as w}
        <div class="card">
          <div class="card-body">
            <h4>{w.url}</h4>
            <div class="events">
              {#each w.events as e}<span class="event-badge">{e}</span>{/each}
            </div>
            <small>{w.is_active ? '✅ Activo' : '❌ Inactivo'}</small>
          </div>
          <button class="delete-btn" on:click={() => handleDelete(w.id)} aria-label="Eliminar">
            <Trash2 size={16} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .header-actions { display: flex; justify-content: flex-end; margin-bottom: 0.5rem; }
  .form-card { background: var(--surface); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border); }
  .form-card h3 { margin: 0 0 0.75rem; }
  .form-card small { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; }
  .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.75rem; }
  .msg { padding: 0.5rem; background: #ffebee; color: #c62828; border-radius: 8px; font-size: 0.85rem; }
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; color: var(--text-secondary); }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .card { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); }
  .card-body { flex: 1; }
  .card-body h4 { margin: 0 0 0.5rem; font-size: 0.85rem; word-break: break-all; }
  .events { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.25rem; }
  .event-badge { font-size: 0.7rem; background: #e3f2fd; color: #1976d2; padding: 0.1rem 0.4rem; border-radius: 99px; }
  .card-body small { font-size: 0.75rem; color: var(--text-secondary); }
  .delete-btn { background: none; border: none; color: #ef5350; cursor: pointer; padding: 0.5rem; }
</style>
