<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
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

<div class="page-header">
  <span class="page-header-title">Webhooks</span>
  <div class="page-header-actions">
    <Button onclick={() => showForm = !showForm} size="sm"><Plus size={16} /> Nuevo</Button>
  </div>
</div>

<div class="page-content" style="display:flex;flex-direction:column;gap:var(--space-4);padding-top:var(--space-4)">
  {#if showForm}
    <div class="section-card" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary)">Nuevo webhook</div>
      <Input id="url" label="URL del webhook" bind:value={url} placeholder="https://ejemplo.com/webhook" />
      <Input id="sec" label="Secret (HMAC)" bind:value={secret} placeholder="Opcional" />
      <Input id="evt" label="Eventos (separados por coma)" bind:value={events}
        placeholder="transfer.completed, fraud.alert" />
      <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:-0.5rem">Disponibles: {eventOptions.join(', ')}</div>
      {#if error}
        <div style="padding:0.75rem;border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--error-bg);color:var(--error-color)">{error}</div>
      {/if}
      <div style="display:flex;gap:var(--space-3);justify-content:flex-end">
        <Button variant="ghost" onclick={() => showForm = false}>Cancelar</Button>
        <Button onclick={handleCreate} loading={saving}>Crear</Button>
      </div>
    </div>
  {/if}

  {#if loading}
    <div style="text-align:center;padding:2rem;color:var(--text-secondary)">Cargando...</div>
  {:else if webhooks.length === 0}
    <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4);padding:3rem 1rem;color:var(--text-secondary)">
      <Webhook size={48} />
      <p style="margin:0;font-size:var(--text-sm)">No hay webhooks registrados</p>
    </div>
  {:else}
    <div style="display:flex;flex-direction:column;gap:var(--space-3)">
      {#each webhooks as w}
        <div class="section-card" style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3)">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary);margin:0 0 var(--space-2);word-break:break-all">{w.url}</div>
            <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-2)">
              {#each w.events as e}<span class="badge" style="font-size:0.7rem;padding:0.15rem 0.5rem">{e}</span>{/each}
            </div>
            <span style="font-size:var(--text-xs);color:var(--text-secondary)">{w.is_active ? '✅ Activo' : '❌ Inactivo'}</span>
          </div>
          <button onclick={() => handleDelete(w.id)} aria-label="Eliminar" style="background:none;border:none;color:var(--error-color);cursor:pointer;padding:var(--space-2);flex-shrink:0">
            <Trash2 size={16} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
