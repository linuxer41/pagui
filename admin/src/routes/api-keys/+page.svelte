<script lang="ts">
  import { onMount } from 'svelte'
  import api from '$lib/api'

  let keys = $state<any[]>([])
  let wallets = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')
  let success = $state('')
  let search = $state('')
  let statusFilter = $state('')
  let page = $state(1)
  let totalPages = $state(1)

  let showCreate = $state(false)
  let createForm = $state({ walletId: '', description: '', qr_generate: true, qr_status: true, qr_cancel: false, expiresAt: '' })
  let creating = $state(false)
  let createError = $state('')
  let lastCreatedKey: any = $state(null)

  let detailKey: any = $state(null)
  let showDetail = $state(false)

  function fmtDate(d: string) { return d ? new Date(d).toLocaleString('es-BO') : '—' }

  async function load() {
    loading = true; error = ''
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res: any = await api.listApiKeys(params.toString())
      if (res.success) {
        const data = res.data
        // backend returns { items, pagination } inside data
        keys = data?.items || data || []
        if (data?.pagination) totalPages = data.pagination.totalPages || 1
      }
    } catch (e:any) { error = e.message }
    finally { loading = false }
  }

  async function loadWallets() {
    try {
      const res: any = await api.listWallets('limit=100')
      if (res.success) wallets = res.data?.items || []
    } catch {}
  }

  async function doCreate() {
    if (!createForm.walletId) { createError = 'Selecciona una billetera'; return }
    creating = true; createError = ''
    try {
      const perms: any = {}
      if (createForm.qr_generate) perms.qr_generate = true
      if (createForm.qr_status) perms.qr_status = true
      if (createForm.qr_cancel) perms.qr_cancel = true
      const res: any = await api.createApiKey({
        walletId: createForm.walletId,
        description: createForm.description || `API key ${createForm.walletId}`,
        permissions: perms,
        expiresAt: createForm.expiresAt || undefined
      })
      if (res.success) {
        lastCreatedKey = res.data
        success = 'API key generada — cópiala ahora (solo se muestra una vez)'
        showCreate = false
        createForm = { walletId: '', description: '', qr_generate: true, qr_status: true, qr_cancel: false, expiresAt: '' }
        await load()
      }
    } catch (e:any) { createError = e.message }
    finally { creating = false }
  }

  async function doRevoke(id: string) {
    if (!confirm('¿Revocar esta API key? No se podrá deshacer.')) return
    try {
      await api.revokeApiKey(id)
      success = 'API key revocada'
      await load()
    } catch (e:any) { error = e.message }
  }

  async function viewDetail(id: string) {
    try {
      const res: any = await api.getApiKey(id)
      if (res.success) { detailKey = res.data; showDetail = true }
    } catch (e:any) { error = e.message }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    success = 'Copiado al portapapeles'
    setTimeout(()=> success='', 2000)
  }

  onMount(async () => { await Promise.all([load(), loadWallets()]) })
</script>

<div class="page-header">
  <div>
    <h1>API Keys</h1>
    <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">Claves para integración — por billetera de recaudación</p>
  </div>
  <button class="btn primary" onclick={() => { createError=''; showCreate=true } }>+ Generar API key</button>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}
{#if success}<div class="success-msg">{success}</div>{/if}

{#if lastCreatedKey}
  <div class="card" style="border-color:var(--success);background:rgba(34,197,94,0.06);margin-bottom:16px">
    <div style="font-weight:700;color:var(--success);margin-bottom:8px">API Key generada — guárdala ahora</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <code style="flex:1;background:var(--bg);border:1px solid var(--border);padding:10px;border-radius:8px;word-break:break-all;font-size:13px">{lastCreatedKey.apiKey || lastCreatedKey.api_key}</code>
      <button class="btn primary small" onclick={() => copy(lastCreatedKey.apiKey || lastCreatedKey.api_key)}>Copiar</button>
      <button class="btn secondary small" onclick={() => lastCreatedKey=null}>Cerrar</button>
    </div>
    <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">Billetera: {lastCreatedKey.walletId} · {lastCreatedKey.description}</div>
  </div>
{/if}

<div class="filters">
  <input type="text" placeholder="Buscar por descripción, wallet o cliente..." bind:value={search} oninput={() => { page=1; load() }} style="flex:1;min-width:220px" />
  <select bind:value={statusFilter} onchange={() => { page=1; load() }}>
    <option value="">Todos</option>
    <option value="active">Activas</option>
    <option value="REVOKED">Revocadas</option>
    <option value="EXPIRED">Expiradas</option>
  </select>
  <button class="btn secondary small" onclick={load}>Buscar</button>
</div>

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if keys.length===0}
  <div class="empty-state">No hay API keys</div>
{:else}
  <div class="card" style="overflow-x:auto;padding:0">
    <table class="table">
      <thead>
        <tr>
          <th>API Key</th>
          <th>Billetera</th>
          <th>Cliente</th>
          <th>Descripción</th>
          <th>Permisos</th>
          <th>Estado</th>
          <th>Creada</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each keys as k}
          <tr>
            <td style="font-family:monospace;font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title={k.apiKeyFull || k.apiKey}>
              {k.apiKey || k.api_key?.slice(0,12)+'••••'}
              <button class="btn secondary small" style="margin-left:6px;padding:2px 6px;font-size:10px" onclick={() => copy(k.apiKeyFull || k.apiKey)}>Copiar</button>
            </td>
            <td style="font-size:12px">
              {#if k.walletNumber}<a href="/wallets/detail?id={k.walletId}" style="color:var(--primary);font-weight:600">{k.walletNumber}</a><div style="font-size:11px;color:var(--text-tertiary)">{k.walletName || ''}</div>{:else}{k.walletId?.toString().slice(-6)}{/if}
            </td>
            <td style="font-size:12px">{k.tenantName || '—'}</td>
            <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis">{k.description || '—'}</td>
            <td style="font-size:11px">
              {#if k.permissions}
                {#each Object.entries(k.permissions) as [perm, val]}
                  {#if val}<span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);margin:1px">{perm}</span>{/if}
                {/each}
              {:else}—{/if}
            </td>
            <td><span class="badge {k.status==='active' ? 'active' : 'inactive'}">{k.status}</span></td>
            <td style="font-size:11px;white-space:nowrap">{fmtDate(k.createdAt)}</td>
            <td style="display:flex;gap:4px">
              <button class="btn secondary small" onclick={() => viewDetail(String(k.id))}>Ver</button>
              {#if k.status==='active'}<button class="btn danger small" onclick={() => doRevoke(String(k.id))}>Revocar</button>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div style="display:flex;justify-content:center;gap:8px;padding:12px">
      <button class="btn secondary small" disabled={page<=1} onclick={() => { page--; load() }}>Anterior</button>
      <span style="font-size:12px;color:var(--text-secondary)">Pág {page} de {totalPages}</span>
      <button class="btn secondary small" disabled={page>=totalPages} onclick={() => { page++; load() }}>Siguiente</button>
    </div>
  </div>
{/if}

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate=false}>
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width:480px">
      <h2>Generar API key</h2>
      {#if createError}<div class="error-msg">{createError}</div>{/if}
      <div class="form-group">
        <label>Billetera de recaudación *</label>
        <select bind:value={createForm.walletId}>
          <option value="">Seleccionar...</option>
          {#each wallets as w}
            <option value={String(w.id)}>{w.walletNumber} — {w.name} ({w.tenantName || w.tenantId?.toString().slice(-6)})</option>
          {/each}
        </select>
      </div>
      <div class="form-group">
        <label>Descripción</label>
        <input type="text" bind:value={createForm.description} placeholder="Ej: Integración POS" />
      </div>
      <div class="form-group">
        <label>Permisos</label>
        <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="checkbox" bind:checked={createForm.qr_generate} /> qr_generate — generar QR</label>
        <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="checkbox" bind:checked={createForm.qr_status} /> qr_status — consultar estado</label>
        <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="checkbox" bind:checked={createForm.qr_cancel} /> qr_cancel — cancelar QR</label>
      </div>
      <div class="form-group">
        <label>Expira (opcional)</label>
        <input type="date" bind:value={createForm.expiresAt} />
      </div>
      <div class="modal-actions">
        <button class="btn secondary" onclick={() => showCreate=false}>Cancelar</button>
        <button class="btn primary" onclick={doCreate} disabled={creating}>{creating ? 'Generando...' : 'Generar'}</button>
      </div>
    </div>
  </div>
{/if}

{#if showDetail && detailKey}
  <div class="modal-overlay" onclick={() => showDetail=false}>
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width:520px">
      <h2>Detalle API key</h2>
      <div style="background:var(--bg);border:1px solid var(--border);padding:12px;border-radius:8px;word-break:break-all;font-family:monospace;font-size:13px;margin-bottom:12px">
        {detailKey.apiKey || detailKey.api_key}
        <button class="btn secondary small" style="margin-left:8px" onclick={() => copy(detailKey.apiKey || detailKey.api_key)}>Copiar</button>
      </div>
      <div style="font-size:13px;display:grid;gap:6px">
        <div><b>Billetera:</b> {detailKey.walletNumber || detailKey.walletId} — {detailKey.walletName || ''}</div>
        <div><b>Cliente:</b> {detailKey.tenantName || '—'}</div>
        <div><b>Descripción:</b> {detailKey.description || '—'}</div>
        <div><b>Estado:</b> <span class="badge {detailKey.status==='active' ? 'active' : 'inactive'}">{detailKey.status}</span></div>
        <div><b>Permisos:</b> {JSON.stringify(detailKey.permissions)}</div>
        <div><b>Creada:</b> {fmtDate(detailKey.createdAt)}</div>
        <div><b>Expira:</b> {detailKey.expiresAt ? fmtDate(detailKey.expiresAt) : 'Nunca'}</div>
      </div>
      <div class="modal-actions">
        <button class="btn secondary" onclick={() => showDetail=false}>Cerrar</button>
        {#if detailKey.status==='active'}<button class="btn danger" onclick={() => { showDetail=false; doRevoke(String(detailKey.id)) }}>Revocar</button>{/if}
      </div>
    </div>
  </div>
{/if}
