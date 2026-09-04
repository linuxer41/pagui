<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let tenant = $state<any>(null)
  let wallets = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')

  // Edit modal
  let showEdit = $state(false)
  let editForm = $state({ fullName: '', email: '', phone: '', address: '', documentType: '', documentNumber: '' })
  let saving = $state(false)
  let editMsg = $state('')

  const id = $derived($page.url.searchParams.get('id') || '')

  const kycBadge = (lvl: string) => {
    const map: Record<string, string> = { none: 'inactive', basic: 'pending', verified: 'active', premium: 'success' }
    return map[lvl] || ''
  }

  const kycLabel = (lvl: string) => {
    const map: Record<string, string> = { none: 'No iniciado', basic: 'Documentos enviados', verified: 'Verificado', premium: 'Premium' }
    return map[lvl] || lvl
  }

  function fmt(n: number) { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n) }

  async function toggleStatus() {
    if (!tenant) return
    const newStatus = tenant.status === 'active' ? 'inactive' : 'active'
    try { await api.toggleTenantStatus(id, newStatus); tenant.status = newStatus }
    catch (e: any) { error = e.message }
  }

  async function toggleEnv() {
    if (!tenant) return
    const newEnv = tenant.environment === 'sandbox' ? 'production' : 'sandbox'
    try { await api.toggleTenantEnvironment(id, newEnv); tenant.environment = newEnv }
    catch (e: any) { error = e.message }
  }

  function openEdit() {
    editForm = {
      fullName: tenant?.fullName || '',
      email: tenant?.email || '',
      phone: tenant?.phone || '',
      address: tenant?.address || '',
      documentType: tenant?.documentType || '',
      documentNumber: tenant?.documentNumber || '',
    }
    editMsg = ''
    showEdit = true
  }

  async function saveEdit() {
    saving = true; editMsg = ''
    try {
      const res = await api.updateTenant(id, editForm)
      editMsg = res.message || 'Cliente actualizado'
      setTimeout(() => { showEdit = false }, 1000)
      const tRes = await api.getTenant(id)
      if (tRes.success) tenant = tRes.data
    } catch (e: any) { editMsg = e.message }
    finally { saving = false }
  }

  onMount(async () => {
    if (!id) { loading = false; error = 'ID no proporcionado'; return }
    loading = true; error = ''
    try {
      const [tRes, wRes] = await Promise.all([
        api.getTenant(id),
        api.listWallets(`tenantId=${id}`),
      ])
      if (tRes.success) tenant = tRes.data
      if (wRes.success) wallets = wRes.data?.items || []
    } catch (e: any) { error = e.message }
    finally { loading = false }
  })
</script>

<div class="page-header">
  <h1>{tenant?.fullName || 'Cargando...'}</h1>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn secondary" onclick={() => goto('/tenants')}>Volver</button>
    <button class="btn primary" onclick={openEdit}>Editar</button>
    <button class="btn secondary" onclick={toggleStatus}>
      {tenant?.status === 'active' ? 'Desactivar' : 'Activar'}
    </button>
    <button class="btn secondary" onclick={toggleEnv}>
      → {tenant?.environment === 'sandbox' ? 'Prod' : 'Sandbox'}
    </button>
  </div>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if tenant}
  <div class="stats-grid" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Email</div>
      <div class="stat-value" style="font-size:16px">{tenant.email || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Teléfono</div>
      <div class="stat-value" style="font-size:16px">{tenant.phone || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Documento</div>
      <div class="stat-value" style="font-size:16px">{tenant.documentType ? `${tenant.documentType.toUpperCase()}: ${tenant.documentNumber}` : '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Entorno</div>
      <div><span class="badge {tenant.environment}" style="font-size:14px">{tenant.environment}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Estado</div>
      <div><span class="badge {tenant.status}" style="font-size:14px">{tenant.status}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Billeteras</div>
      <div class="stat-value" style="font-size:16px">{tenant.walletCount || 0}</div>
      <div class="stat-sub">Saldo total: Bs {fmt(tenant.totalBalance || 0)}</div>
    </div>
  </div>

  {#if tenant.address}
    <div class="card" style="margin-bottom:20px;padding:12px;font-size:13px;color:var(--text-secondary)">
      Dirección: {tenant.address}
    </div>
  {/if}

  {#if tenant.nationality || tenant.dateOfBirth}
    <div class="card" style="margin-bottom:20px;padding:12px;font-size:13px;color:var(--text-secondary)">
      {#if tenant.nationality}Nacionalidad: {tenant.nationality} | {/if}
      {#if tenant.dateOfBirth}Fecha de nacimiento: {new Date(tenant.dateOfBirth).toLocaleDateString('es-BO')}{/if}
    </div>
  {/if}

  <h2 style="font-size:16px;font-weight:600;margin-bottom:8px;margin-top:20px">KYC</h2>

  <div class="stats-grid" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Nivel KYC</div>
      <div><span class="badge {kycBadge(tenant.kycLevel)}" style="font-size:14px">{kycLabel(tenant.kycLevel)}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Enviado</div>
      <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">
        {tenant.kycSubmittedAt ? new Date(tenant.kycSubmittedAt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Verificado</div>
      <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">
        {tenant.kycVerifiedAt ? new Date(tenant.kycVerifiedAt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Verificado por</div>
      <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">{tenant.kycVerifiedBy || '—'}</div>
    </div>
    {#if tenant.kycRejectionReason}
      <div class="stat-card" style="border-color:var(--danger)">
        <div class="stat-label">Motivo de rechazo</div>
        <div class="stat-value" style="font-size:14px;color:var(--danger)">{tenant.kycRejectionReason}</div>
      </div>
    {/if}
  </div>

  <h2 style="font-size:16px;font-weight:600;margin-bottom:8px;margin-top:20px">Billeteras</h2>

  {#if wallets.length === 0}
    <div class="empty-state">Este cliente no tiene billeteras</div>
  {:else}
    <div class="card" style="overflow-x:auto">
      <table class="table">
        <thead>
            <tr>
              <th>Número</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {#each wallets as w}
              <tr>
                <td><a href="/wallets/detail?id={w.id}" style="color:var(--primary);text-decoration:none;font-weight:600">{w.walletNumber}</a></td>
                <td>{w.name} {#if w.isCollection}<span class="badge" style="background:{w.collectionType==='direct' ? 'rgba(16,185,129,0.12);color:#059669' : 'rgba(99,102,241,0.08);color:var(--primary)'};margin-left:6px">{w.collectionType==='direct' ? 'Directo' : 'Gateway'}</span>{/if}</td>
                <td><span class="badge" style="background:rgba(var(--primary-rgb),0.1);color:var(--primary)">{w.type}</span></td>
                <td>{#if w.isCollection && w.collectionType==='direct'}<span style="color:var(--text-tertiary)">Bs 0,00</span> <span style="font-size:10px;color:#059669">· directo</span>{:else}Bs {fmt(w.balance)}{/if}</td>
                <td><span class="badge {w.status}">{w.status}</span></td>
                <td><button class="btn primary small" onclick={() => goto(`/wallets/detail?id=${w.id}`)}>Ver</button></td>
              </tr>
            {/each}
        </tbody>
      </table>
    </div>
  {/if}
{/if}

{#if showEdit}
  <div class="modal-overlay" onclick={() => showEdit = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>Editar cliente</h2>
      {#if editMsg}<div class="success-msg">{editMsg}</div>{/if}
      <form onsubmit={(e) => { e.preventDefault(); saveEdit() }}>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" bind:value={editForm.fullName} />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" bind:value={editForm.email} />
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" bind:value={editForm.phone} />
        </div>
        <div class="form-group">
          <label>Dirección</label>
          <input type="text" bind:value={editForm.address} />
        </div>
        <div class="form-group">
          <label>Tipo documento</label>
          <select bind:value={editForm.documentType}>
            <option value="">—</option>
            <option value="ci">CI</option>
            <option value="passport">Pasaporte</option>
            <option value="nit">NIT</option>
          </select>
        </div>
        <div class="form-group">
          <label>Número documento</label>
          <input type="text" bind:value={editForm.documentNumber} />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" onclick={() => showEdit = false}>Cancelar</button>
          <button type="submit" class="btn primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}
