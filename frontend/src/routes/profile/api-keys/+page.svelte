<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import { Calendar, Clock, Copy, Eye, EyeOff, Key, PlusCircle, Trash2, AlertCircle, Receipt, Check, X, FileText } from '@lucide/svelte'
  import WalletInfo from '$lib/components/composite/WalletInfo.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import Checkbox from '$lib/components/Checkbox.svelte'

  let wallet: any = $state(null)
  let hasWallet = $state<boolean | null>(null)
  let loading = $state(true)
  let error = $state('')

  let apiKeys: any[] = $state([])
  let keysLoading = $state(false)

  let showCreate = $state(false)
  let newKeyName = $state('')
  let permGenerate = $state(true)
  let permStatus = $state(true)
  let permCancel = $state(false)
  let creating = $state(false)
  let newKeyResult: any = $state(null)
  let showKeyValue = $state(false)
  let copied = $state(false)

  let deletingId = $state<number | null>(null)

  onMount(() => load())

  async function load() {
    loading = true; error = ''
    try {
      const res = await api.getCollectionWallet()
      if (res.success) {
        hasWallet = !!res.data
        wallet = res.data
        if (wallet?.id) loadKeys()
      }
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  async function loadKeys() {
    if (!wallet?.id) return
    keysLoading = true
    try {
      const res = await api.listApiKeys(String(wallet.id))
      if (res.success) apiKeys = (res.data as any[]) || []
    } catch {}
    finally { keysLoading = false }
  }

  async function createKey() {
    if (!newKeyName.trim() || !wallet?.id) return
    creating = true
    try {
      const res = await api.generateApiKey({
        walletId: String(wallet.id),
        description: newKeyName.trim(),
        permissions: { qr_generate: permGenerate, qr_status: permStatus, qr_cancel: permCancel },
      })
      if (res.success) {
        newKeyResult = res.data
        showKeyValue = true
        copied = false
        newKeyName = ''
        showCreate = false
        resetPerms()
        loadKeys()
      } else {
        error = res.message || 'Error al crear API key'
      }
    } catch (e: any) { error = e.message }
    finally { creating = false }
  }

  function resetPerms() {
    permGenerate = true
    permStatus = true
    permCancel = false
  }

  const hasAnyPerm = $derived(permGenerate || permStatus || permCancel)

  async function deleteKey(id: number) {
    try {
      const res = await api.revokeApiKey(id)
      if (res.success) {
        apiKeys = apiKeys.filter((k: any) => k.id !== id)
      }
    } catch {}
    finally { deletingId = null }
  }

  function copyKey(val: string) {
    navigator.clipboard.writeText(val)
    copied = true
    setTimeout(() => copied = false, 2000)
  }

  function formatDate(d: string) {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  function isExpired(k: any) {
    return k.expiresAt && new Date(k.expiresAt) < new Date()
  }

  function permissionTags(perms: Record<string, boolean>) {
    const tags: string[] = []
    if (perms?.qr_generate) tags.push('QR: Generar')
    if (perms?.qr_status) tags.push('QR: Estado')
    if (perms?.qr_cancel) tags.push('QR: Cancelar')
    if (tags.length === 0) tags.push('Sin permisos')
    return tags
  }
</script>

<PageLayout title="API Keys">
  {#snippet actions()}
    <IconButton onclick={() => goto('/docs/api-keys')} label="Documentación">
      <FileText size={20} />
    </IconButton>
  {/snippet}
  <p class="page-desc">Crea y gestiona claves de API para integrar Pagui con tus sistemas externos de forma segura.</p>
  <div class="content">
  {#if error}
    <div class="error-msg"><AlertCircle size={16} /><span>{error}</span></div>
  {/if}

  {#if loading}
    <div class="loading">Cargando...</div>

  {:else if hasWallet === false}
    <div class="onboarding">
      <div class="onboarding-icon"><Key size={32} /></div>
      <h2 class="onboarding-title">Sin billetera de recaudación</h2>
      <p class="onboarding-desc">Activa una billetera de recaudación para poder generar API keys.</p>
      <button class="cta-btn" onclick={() => goto('/collections')}>Ir a Cobros</button>
    </div>

  {:else}
    <WalletInfo {wallet} />

    <div class="section-header">
      <h2 class="section-title">API Keys activas</h2>
      <button class="add-btn" onclick={() => { showCreate = !showCreate; newKeyResult = null }}>
        <PlusCircle size={16} /><span>{showCreate ? 'Cancelar' : 'Nueva'}</span>
      </button>
    </div>

    {#if newKeyResult}
      <div class="new-key-card">
        <div class="new-key-header">
          <Check size={18} />
          <span>API key creada</span>
        </div>
        <div class="new-key-body">
          <div class="key-name">{newKeyResult.description}</div>
          <div class="key-value-wrap">
            <code class="key-value">{showKeyValue ? newKeyResult.apiKey : '••••••••••••••••••••••••••••••••••••••••'}</code>
            <button class="icon-btn" onclick={() => showKeyValue = !showKeyValue}>
              {#if showKeyValue}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
            </button>
            <button class="icon-btn" onclick={() => copyKey(newKeyResult.apiKey)}>
              {#if copied}<Check size={16} style="color:var(--success-color)" />{:else}<Copy size={16} />{/if}
            </button>
          </div>
          <p class="warning-msg"><AlertCircle size={14} />Guarda esta clave ahora, no podrás verla después.</p>
          <button class="close-btn" onclick={() => newKeyResult = null}>Entendido</button>
        </div>
      </div>
    {/if}

    {#if showCreate}
      <div class="create-section">
        <div class="field">
          <label class="field-label">Nombre descriptivo</label>
          <input class="field-input" type="text" bind:value={newKeyName} placeholder="Ej: Integración POS" />
        </div>
        <div class="field">
          <label class="field-label">Permisos</label>
          <div class="perm-list">
            <Checkbox id="perm-generate" bind:checked={permGenerate} label="Generar QR">
              <span class="perm-desc">Crear códigos QR de cobro</span>
            </Checkbox>
            <Checkbox id="perm-status" bind:checked={permStatus} label="Consultar estado">
              <span class="perm-desc">Ver el estado de pagos y QR</span>
            </Checkbox>
            <Checkbox id="perm-cancel" bind:checked={permCancel} label="Cancelar QR">
              <span class="perm-desc">Anular códigos QR pendientes</span>
            </Checkbox>
          </div>
        </div>
        {#if !hasAnyPerm}
          <p class="perm-warning"><AlertCircle size={14} />Selecciona al menos un permiso</p>
        {/if}
        <button class="cta-btn" onclick={createKey} disabled={!newKeyName.trim() || !hasAnyPerm || creating}>
          {creating ? 'Creando...' : 'Generar API key'}
        </button>
      </div>
    {/if}

    {#if keysLoading}
      <div class="loading-sm">Cargando keys...</div>
    {:else if apiKeys.length === 0}
      <div class="empty-state">
        <Key size={24} />
        <span>No hay API keys activas</span>
        <span class="empty-desc">Crea una API key para integrar tu billetera de recaudación.</span>
      </div>
    {:else}
      <div class="keys-list">
        {#each apiKeys as k (k.id)}
          <div class="key-card">
            <div class="key-card-header">
              <div class="key-card-info">
                <span class="key-card-name">{k.description || 'Sin nombre'}</span>
                <span class="key-card-status" class:expired={isExpired(k)}>
                  {#if isExpired(k)}
                    <Clock size={14} /> Expirada
                  {:else if k.status === 'active'}
                    <Check size={14} /> Activa
                  {:else}
                    <X size={14} /> {k.status}
                  {/if}
                </span>
              </div>
              {#if deletingId === k.id}
                <div class="delete-confirm">
                  <span>¿Eliminar?</span>
                  <button class="confirm-yes" onclick={() => deleteKey(k.id)}>Sí</button>
                  <button class="confirm-no" onclick={() => deletingId = null}>No</button>
                </div>
              {:else}
                <button class="delete-btn" onclick={() => deletingId = k.id}><Trash2 size={16} /></button>
              {/if}
            </div>
            <div class="key-card-value">
              <code>{k.apiKey.substring(0, 10)}••••••••••••</code>
              <button class="copy-mini" onclick={() => copyKey(k.apiKey)}><Copy size={14} /></button>
            </div>
            <div class="key-card-meta">
              <span><Calendar size={14} /> {formatDate(k.createdAt)}</span>
              {#if k.expiresAt}
                <span class:expired={isExpired(k)}><Clock size={14} /> Expira: {formatDate(k.expiresAt)}</span>
              {/if}
            </div>
            {#if k.permissions}
              <div class="perm-tags">
                {#each permissionTags(k.permissions) as tag}
                  <span class="perm-tag">{tag}</span>
                {/each}
              </div>
            {/if}
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

  .new-key-card { background: rgba(var(--surface-rgb), 1); border: 2px solid rgba(16,185,129,0.5); border-radius: var(--radius-xl); overflow: hidden; box-shadow: 0 0 0 1px rgba(16,185,129,0.2); }
  .new-key-header { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); background: rgba(16,185,129,0.1); color: rgba(16,185,129,1); font-weight: 700; font-size: var(--text-sm); }
  .new-key-body { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .key-name { font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .key-value-wrap { display: flex; align-items: center; gap: var(--space-2); }
  .key-value { flex: 1; padding: var(--space-3); background: rgba(var(--bg-rgb), 1); border-radius: var(--radius-md); font-family: monospace; font-size: var(--text-xs); word-break: break-all; border: 1px solid rgba(var(--border-rgb), 0.3); }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: var(--radius-md); border: 1px solid rgba(var(--border-rgb), 0.3); background: none; color: rgba(var(--text-secondary-rgb), 1); cursor: pointer; flex-shrink: 0; }
  .warning-msg { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: rgba(245,158,11,1); margin: 0; }
  .close-btn { padding: var(--space-2) var(--space-4); border-radius: var(--radius-lg); background: rgba(var(--surface-rgb), 0.5); border: 1px solid rgba(var(--border-rgb), 0.3); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); font-weight: 600; cursor: pointer; align-self: flex-end; }

  .create-section { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); border: 1px solid rgba(var(--border-rgb), 0.3); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .field-input { padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); background: rgba(var(--bg-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); outline: none; }
  .field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15); }
  .perm-list { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3); background: rgba(var(--bg-rgb), 1); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); }
  .perm-desc { display: block; font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); margin-top: 2px; }
  .perm-warning { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: rgba(245,158,11,1); margin: 0; }

  .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-8); color: var(--muted-foreground); text-align: center; }
  .empty-state span:first-of-type { font-weight: 600; color: rgba(var(--text-secondary-rgb), 1); }
  .empty-desc { font-size: var(--text-sm); }

  .keys-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .key-card { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.3); display: flex; flex-direction: column; gap: var(--space-3); }
  .key-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
  .key-card-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .key-card-name { font-weight: 600; font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); }
  .key-card-status { display: flex; align-items: center; gap: var(--space-1); font-size: var(--text-xs); font-weight: 500; color: rgba(16,185,129,1); }
  .key-card-status.expired { color: rgba(var(--error-rgb), 1); }
  .delete-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius-md); border: none; background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); cursor: pointer; flex-shrink: 0; }
  .delete-confirm { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); }
  .delete-confirm span { color: rgba(var(--error-rgb), 1); font-weight: 600; }
  .confirm-yes, .confirm-no { padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm); border: none; font-size: var(--text-xs); font-weight: 600; cursor: pointer; }
  .confirm-yes { background: rgba(var(--error-rgb), 1); color: white; }
  .confirm-no { background: rgba(var(--border-rgb), 0.3); color: rgba(var(--text-secondary-rgb), 1); }

  .key-card-value { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: rgba(var(--bg-rgb), 1); border-radius: var(--radius-md); border: 1px solid rgba(var(--border-rgb), 0.2); }
  .key-card-value code { font-family: monospace; font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); flex: 1; }
  .copy-mini { display: flex; border: none; background: none; color: rgba(var(--text-secondary-rgb), 1); cursor: pointer; padding: 2px; }

  .key-card-meta { display: flex; flex-wrap: wrap; gap: var(--space-3); font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
  .key-card-meta span { display: flex; align-items: center; gap: 4px; }
  .key-card-meta span.expired { color: rgba(var(--error-rgb), 1); }

  .perm-tags { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .perm-tag { padding: 2px 8px; border-radius: var(--radius-full); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); font-size: 0.7rem; font-weight: 600; }

  .loading-sm { text-align: center; padding: var(--space-4); color: var(--muted-foreground); font-size: var(--text-sm); }
</style>
