<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import WalletInfo from '$lib/components/composite/WalletInfo.svelte'
  import { Webhook, PlusCircle, Trash2, AlertCircle, Receipt, Check, X, FileText } from '@lucide/svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'

  let wallet: any = $state(null)
  let hasWallet = $state<boolean | null>(null)
  let loading = $state(true)
  let error = $state('')

  let webhooks: any[] = $state([])
  let hooksLoading = $state(false)

  let showCreate = $state(false)
  let url = $state('')
  let selectedEvents = $state<Record<string, boolean>>({
    'transfer.completed': true,
    'transfer.failed': true,
    'transfer.created': false,
    'wallet.topup': false,
    'fraud.alert': false,
  })
  let creating = $state(false)
  let deletingId = $state<string | null>(null)

  const eventLabels: Record<string, string> = {
    'transfer.created': 'Transferencia creada',
    'transfer.completed': 'Transferencia completada',
    'transfer.failed': 'Transferencia fallida',
    'wallet.topup': 'Recarga de saldo',
    'fraud.alert': 'Alerta de fraude',
  }

  onMount(() => load())

  async function load() {
    loading = true; error = ''
    try {
      const res = await api.getCollectionWallet()
      if (res.success) {
        hasWallet = !!res.data
        wallet = res.data
        if (wallet?.id) loadHooks()
      }
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  async function loadHooks() {
    if (!wallet?.id) return
    hooksLoading = true
    try {
      const res = await api.listWebhooks(String(wallet.id))
      if (res.success) webhooks = (res.data as any[]) || []
    } catch {}
    finally { hooksLoading = false }
  }

  async function handleCreate() {
    if (!url.trim() || !wallet?.id) return
    const events = Object.entries(selectedEvents).filter(([, v]) => v).map(([k]) => k)
    if (events.length === 0) { error = 'Selecciona al menos un evento'; return }
    creating = true; error = ''
    try {
      const res: any = await api.registerWebhook({
        walletId: String(wallet.id),
        url: url.trim(),
        events,
      })
      if (res && res.success !== false) {
        const data = res.data || {}
        webhooks = [{ id: data.id ?? res.id, walletId: wallet.id, url: url.trim(), events, isActive: true }, ...webhooks]
        showCreate = false; url = ''; Object.keys(selectedEvents).forEach(k => selectedEvents[k] = k === 'transfer.completed' || k === 'transfer.failed')
      } else error = res.message || 'Error al crear webhook'
    } catch (e: any) { error = e.message }
    finally { creating = false }
  }

  async function handleDelete(id: string) {
    if (!wallet?.id) return
    try {
      await api.deleteWebhook(id, String(wallet.id))
      webhooks = webhooks.filter((w: any) => w.id !== id)
    } catch {}
    finally { deletingId = null }
  }

  function formatDate(d: string) {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }
</script>

<PageLayout title="Webhooks">
  {#snippet actions()}
    <IconButton onclick={() => goto('/docs/webhooks')} label="Documentación">
      <FileText size={20} />
    </IconButton>
  {/snippet}
  <p class="page-desc">Recibe notificaciones automáticas cuando ocurran eventos en tu billetera de recaudación. La firma HMAC se genera usando tu API Key activa.</p>
  <div class="content">
  {#if error}
    <div class="error-msg"><AlertCircle size={16} /><span>{error}</span></div>
  {/if}

  {#if loading}
    <div class="loading">Cargando...</div>

  {:else if hasWallet === false}
    <div class="onboarding">
      <div class="onboarding-icon"><Webhook size={32} /></div>
      <h2 class="onboarding-title">Sin billetera de recaudación</h2>
      <p class="onboarding-desc">Activa una billetera de recaudación para configurar webhooks.</p>
      <button class="cta-btn" onclick={() => goto('/collections')}>Ir a Cobros</button>
    </div>

  {:else}
    <WalletInfo {wallet} />

    <div class="section-header">
      <h2 class="section-title">Webhooks activos</h2>
      <button class="add-btn" onclick={() => showCreate = !showCreate}>
        <PlusCircle size={16} /><span>{showCreate ? 'Cancelar' : 'Nuevo'}</span>
      </button>
    </div>

    {#if showCreate}
      <div class="create-section">
        <div class="field">
          <label class="field-label">URL del webhook</label>
          <input class="field-input" type="url" bind:value={url} placeholder="https://ejemplo.com/webhook" />
        </div>
        <div class="field">
          <label class="field-label">Eventos</label>
          <div class="events-grid">
            {#each Object.entries(eventLabels) as [key, label]}
              <button class="event-chip" class:active={selectedEvents[key]} onclick={() => selectedEvents[key] = !selectedEvents[key]}>
                {#if selectedEvents[key]}<Check size={14} />{:else}<X size={14} />{/if}
                <span>{label}</span>
              </button>
            {/each}
          </div>
        </div>
        <button class="cta-btn" onclick={handleCreate} disabled={!url.trim() || creating}>
          {creating ? 'Creando...' : 'Crear webhook'}
        </button>
        <p class="hmac-note"><AlertCircle size={14} />Los webhooks se firman con HMAC usando tu API Key activa.</p>
      </div>
    {/if}

    {#if hooksLoading}
      <div class="loading-sm">Cargando webhooks...</div>
    {:else if webhooks.length === 0}
      <div class="empty-state">
        <Webhook size={24} />
        <span>No hay webhooks activos</span>
        <span class="empty-desc">Crea un webhook para recibir notificaciones de eventos.</span>
      </div>
    {:else}
      <div class="hooks-list">
        {#each webhooks as w (w.id)}
          <div class="hook-card">
            <div class="hook-card-header">
              <div class="hook-card-info">
                <span class="hook-card-url">{w.url}</span>
                <span class="hook-card-status" class:inactive={!w.isActive}>
                  {#if w.isActive}<Check size={14} /> Activo{:else}<X size={14} /> Inactivo{/if}
                </span>
              </div>
              {#if deletingId === w.id}
                <div class="delete-confirm">
                  <span>¿Eliminar?</span>
                  <button class="confirm-yes" onclick={() => handleDelete(w.id)}>Sí</button>
                  <button class="confirm-no" onclick={() => deletingId = null}>No</button>
                </div>
              {:else}
                <button class="delete-btn" onclick={() => deletingId = w.id}><Trash2 size={16} /></button>
              {/if}
            </div>
            <div class="hook-card-events">
              {#each w.events as e}
                <span class="event-tag">{eventLabels[e] || e}</span>
              {/each}
            </div>
            <div class="hook-card-meta">
              <span>Creado: {formatDate(w.createdAt)}</span>
              {#if w.lastSentAt}
                <span>Último envío: {formatDate(w.lastSentAt)}</span>
              {/if}
              {#if w.lastError}
                <span class="error-text">Error: {w.lastError}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</PageLayout>

<style>
  .content { display: flex; flex-direction: column; gap: var(--space-4); }
  .page-desc { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); margin: 0 0 var(--space-2); line-height: 1.5; }
  .error-msg { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); border-radius: var(--radius-lg); font-size: var(--text-sm); }
  .loading { text-align: center; padding: var(--space-8); color: var(--muted-foreground); }

  .onboarding { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); text-align: center; padding: var(--space-8) 0; }
  .onboarding-icon { width: 64px; height: 64px; border-radius: var(--radius-2xl); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; }
  .onboarding-title { font-size: var(--text-xl); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .onboarding-desc { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); max-width: 300px; margin: 0; }
  .cta-btn { width: 100%; padding: var(--space-4); border: none; border-radius: var(--radius-xl); background: var(--primary); color: var(--primary-foreground); font-size: var(--text-base); font-weight: 700; cursor: pointer; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .section-header { display: flex; align-items: center; justify-content: space-between; }
  .section-title { font-size: var(--text-sm); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .add-btn { display: flex; align-items: center; gap: var(--space-1); padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); border: none; background: rgba(var(--primary-rgb), 0.1); color: var(--primary); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }

  .create-section { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); border: 1px solid rgba(var(--border-rgb), 0.3); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .field-input { padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); background: rgba(var(--bg-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); outline: none; }
  .field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15); }
  .hmac-note { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; }

  .events-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .event-chip { display: flex; align-items: center; gap: var(--space-1); padding: var(--space-2) var(--space-3); border-radius: var(--radius-full); border: 1px solid rgba(var(--border-rgb), 0.3); background: rgba(var(--surface-rgb), 0.5); color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-xs); font-weight: 500; cursor: pointer; }
  .event-chip.active { background: rgba(var(--primary-rgb), 0.1); border-color: var(--primary); color: var(--primary); }
  .event-chip svg { flex-shrink: 0; }

  .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-8); color: var(--muted-foreground); text-align: center; }
  .empty-state span:first-of-type { font-weight: 600; color: rgba(var(--text-secondary-rgb), 1); }
  .empty-desc { font-size: var(--text-sm); }

  .hooks-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .hook-card { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.3); display: flex; flex-direction: column; gap: var(--space-3); }
  .hook-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
  .hook-card-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .hook-card-url { font-weight: 600; font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); word-break: break-all; }
  .hook-card-status { display: flex; align-items: center; gap: var(--space-1); font-size: var(--text-xs); font-weight: 500; color: rgba(16,185,129,1); }
  .hook-card-status.inactive { color: rgba(var(--text-tertiary-rgb), 1); }
  .delete-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius-md); border: none; background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); cursor: pointer; flex-shrink: 0; }
  .delete-confirm { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); }
  .delete-confirm span { color: rgba(var(--error-rgb), 1); font-weight: 600; }
  .confirm-yes, .confirm-no { padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm); border: none; font-size: var(--text-xs); font-weight: 600; cursor: pointer; }
  .confirm-yes { background: rgba(var(--error-rgb), 1); color: white; }
  .confirm-no { background: rgba(var(--border-rgb), 0.3); color: rgba(var(--text-secondary-rgb), 1); }

  .hook-card-events { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .event-tag { padding: 2px 8px; border-radius: var(--radius-full); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); font-size: 0.7rem; font-weight: 600; }

  .hook-card-meta { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
  .error-text { color: rgba(var(--error-rgb), 1); }

  .loading-sm { text-align: center; padding: var(--space-4); color: var(--muted-foreground); font-size: var(--text-sm); }
</style>
