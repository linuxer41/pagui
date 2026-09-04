<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let wallet = $state<any>(null)
  let movements = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')
  let showCredit = $state(false)
  let creditAmount = $state('')
  let creditDesc = $state('')
  let crediting = $state(false)
  let creditError = $state('')
  let creditSuccess = $state('')

  let mPage = $state(1)
  let mTotalPages = $state(1)
  let typeFilter = $state('')
  let statusFilter = $state('')
  let dateFrom = $state('')
  let dateTo = $state('')

  // Transfer tenant
  let showTransfer = $state(false)
  let tenants = $state<any[]>([])
  let targetTenantId = $state('')
  let transferring = $state(false)
  let transferMsg = $state('')

  // Permissions
  let permissions = $state<any[]>([])
  let showPermModal = $state(false)
  let permUserSearch = $state('')
  let permUsers = $state<any[]>([])
  let permSelectedUserId = $state('')
  let permSelectedRole = $state('viewer')
  let permSearching = $state(false)
  let permMsg = $state('')
  let showConfirmRevoke = $state(false)
  let revokeTarget = $state<any>(null)

  const id = $derived($page.url.searchParams.get('id') || '')

  async function loadMovements(pg = mPage) {
    try {
      const params = new URLSearchParams()
      params.set('page', String(pg))
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await api.getWalletMovements(id, params.toString())
      if (res.success) {
        movements = res.data?.items || []
        const pag = res.data?.pagination
        if (pag) { mPage = pag.page; mTotalPages = pag.totalPages }
      }
    } catch (e: any) { error = e.message }
  }

  async function loadWallet() {
    loading = true; error = ''
    try {
      const [wRes, pRes] = await Promise.all([
        api.getWallet(id),
        api.getWalletPermissions(id),
      ])
      if (wRes.success) wallet = wRes.data
      if (pRes.success) permissions = pRes.data?.items || []
      await loadMovements()
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  async function loadTenants() {
    try {
      const res = await api.listTenants()
      if (res.success) tenants = res.data?.items || []
    } catch (e: any) { error = e.message }
  }

  async function toggleStatus() {
    if (!wallet) return
    const newStatus = wallet.status === 'active' ? 'suspended' : 'active'
    try { await api.toggleWalletStatus(id, newStatus); wallet.status = newStatus }
    catch (e: any) { error = e.message }
  }

  async function doTransfer() {
    if (!targetTenantId) { transferMsg = 'Seleccione un cliente destino'; return }
    transferring = true; transferMsg = ''
    try {
      const res = await api.transferWalletTenant(id, targetTenantId)
      transferMsg = res.message || 'Billetera transferida'
      showTransfer = false
      loadWallet()
    } catch (e: any) { transferMsg = e.message }
    finally { transferring = false }
  }

  async function searchUsers() {
    if (!permUserSearch.trim()) return
    permSearching = true
    try {
      const res = await api.listUsers(`search=${permUserSearch}`)
      if (res.success) permUsers = res.data || []
    } catch { permUsers = [] }
    finally { permSearching = false }
  }

  async function grantPermission() {
    if (!permSelectedUserId) { permMsg = 'Seleccione un usuario'; return }
    permMsg = ''
    try {
      await api.grantWalletPermission(id, permSelectedUserId, permSelectedRole)
      permMsg = 'Permiso concedido'
      permSelectedUserId = ''; permUserSearch = ''; permUsers = []; showPermModal = false
      const pRes = await api.getWalletPermissions(id)
      if (pRes.success) permissions = pRes.data?.items || []
    } catch (e: any) { permMsg = e.message }
  }

  function confirmRevoke(p: any) { revokeTarget = p; showConfirmRevoke = true }

  async function doRevoke() {
    if (!revokeTarget) return
    try {
      await api.revokeWalletPermission(id, revokeTarget.userId)
      const pRes = await api.getWalletPermissions(id)
      if (pRes.success) permissions = pRes.data?.items || []
    } catch (e: any) { error = e.message }
    finally { showConfirmRevoke = false; revokeTarget = null }
  }

  async function doCredit() {
    const amt = parseFloat(creditAmount)
    if (isNaN(amt) || amt <= 0) { creditError = 'Monto inválido'; return }
    crediting = true; creditError = ''; creditSuccess = ''
    try {
      await api.creditWallet(id, creditAmount, creditDesc)
      creditSuccess = `Bs ${amt.toFixed(2)} acreditados`
      creditAmount = ''; creditDesc = ''
      showCredit = false
      loadWallet()
    } catch (e: any) { creditError = e.message }
    finally { crediting = false }
  }

  function fmt(n: number) { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n) }

  function movementTypeLabel(type: string) {
    const map: Record<string, string> = { deposit: 'Depósito', transfer_in: 'Transferencia recibida', transfer_out: 'Transferencia enviada', qr_payment: 'Pago QR', fee: 'Comisión', withdrawal: 'Retiro', debit: 'Débito', credit: 'Crédito' }
    return map[type] || type
  }

  function permRoleBadge(role: string) {
    const map: Record<string, string> = { owner: 'production', manager: 'active', viewer: 'pending' }
    return map[role] || ''
  }

  function goPage(pg: number) { if (pg >= 1 && pg <= mTotalPages) { mPage = pg; loadMovements(pg) } }

  onMount(async () => {
    if (!id) { loading = false; error = 'ID no proporcionado'; return }
    await loadWallet()
  })
</script>

<div class="page-header">
  <h1>Billetera {wallet?.walletNumber || 'Cargando...'}</h1>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn secondary" onclick={() => goto('/wallets')}>Volver</button>
    <button class="btn primary" onclick={() => showCredit = true}>+ Abonar saldo</button>
    <button class="btn secondary" onclick={toggleStatus}>
      {wallet?.status === 'active' ? 'Suspender' : 'Activar'}
    </button>
    <button class="btn secondary" onclick={() => { loadTenants(); showTransfer = true }}>Transferir cliente</button>
  </div>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if wallet}
  <div class="stats-grid" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Nombre</div>
      <div class="stat-value" style="font-size:18px">{wallet.name}</div>
      {#if wallet.isCollection}<div style="margin-top:6px"><span class="badge" style="background:{wallet.collectionType==='direct' ? 'rgba(16,185,129,0.15);color:#059669' : 'rgba(99,102,241,0.1);color:var(--primary)'}">{wallet.collectionType==='direct' ? 'Directo · cuenta propia' : 'Gateway Pagui'}</span></div>{/if}
    </div>
    <div class="stat-card">
      <div class="stat-label">Saldo</div>
      {#if wallet.isCollection && wallet.collectionType==='direct'}
        <div class="stat-value" style="color:var(--text-tertiary)">Bs 0,00</div>
        <div class="stat-sub" style="color:#059669">Directo — fondos a banco propio, solo comisión</div>
      {:else}
        <div class="stat-value">Bs {fmt(wallet.balanceDisplay ?? wallet.balance)}</div>
        <div class="stat-sub">Disponible: Bs {fmt(wallet.availableBalance)}</div>
      {/if}
    </div>
    <div class="stat-card">
      <div class="stat-label">Estado</div>
      <div><span class="badge {wallet.status}" style="font-size:14px">{wallet.status}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Cliente</div>
      <div class="stat-value" style="font-size:16px;color:var(--text-secondary)">{wallet.tenantName || '—'}</div>
      {#if wallet.tenantEnvironment}<div><span class="badge {wallet.tenantEnvironment}">{wallet.tenantEnvironment}</span></div>{/if}
    </div>
  </div>

  <h2 style="font-size:16px;font-weight:600;margin-bottom:8px">Permisos de usuarios</h2>
  <div class="card" style="overflow-x:auto;margin-bottom:20px">
    {#if permissions.length === 0}
      <div class="empty-state" style="padding:8px 0">Sin permisos asignados</div>
    {:else}
      <table class="table">
        <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Acción</th></tr></thead>
        <tbody>
          {#each permissions as p}
            <tr>
              <td style="font-weight:600">{p.fullName}</td>
              <td style="font-size:12px;color:var(--text-secondary)">{p.email}</td>
              <td><span class="badge {permRoleBadge(p.role)}">{p.role}</span></td>
              <td><button class="btn secondary small" onclick={() => confirmRevoke(p)}>Revocar</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
    <button class="btn primary small" style="margin-top:8px" onclick={() => { permUserSearch = ''; permUsers = []; permSelectedUserId = ''; permSelectedRole = 'viewer'; permMsg = ''; showPermModal = true }}>+ Agregar usuario</button>
  </div>

  <h2 style="font-size:16px;font-weight:600;margin-bottom:8px">Movimientos</h2>
  <div class="filters">
    <input type="date" bind:value={dateFrom} onchange={() => goPage(1)} style="width:auto" />
    <input type="date" bind:value={dateTo} onchange={() => goPage(1)} style="width:auto" />
    <select bind:value={typeFilter} onchange={() => goPage(1)}>
      <option value="">Todos los tipos</option>
      <option value="deposit">Depósito</option>
      <option value="transfer_in">Transferencia recibida</option>
      <option value="transfer_out">Transferencia enviada</option>
      <option value="qr_payment">Pago QR</option>
      <option value="fee">Comisión</option>
    </select>
    <select bind:value={statusFilter} onchange={() => goPage(1)}>
      <option value="">Todos</option>
      <option value="completed">Completados</option>
      <option value="pending">Pendientes</option>
      <option value="failed">Fallidos</option>
    </select>
  </div>

  <div class="card" style="overflow-x:auto">
    {#if movements.length === 0}
      <div class="empty-state">No hay movimientos</div>
    {:else}
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Monto</th>
            <th>Saldo</th>
            <th>Descripción</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {#each movements as m}
            <tr>
              <td style="white-space:nowrap;font-size:12px">{new Date(m.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              <td><span class="badge" style="background:rgba(var(--primary-rgb),0.1);color:var(--primary);white-space:nowrap">{movementTypeLabel(m.movementType)}</span></td>
              <td style="font-weight:600;color:{['transfer_out','fee','withdrawal','debit'].includes(m.movementType) ? 'var(--danger)' : 'var(--success)'}">
                {['transfer_out','fee','withdrawal','debit'].includes(m.movementType) ? '-' : '+'}Bs {fmt(m.amount)}
              </td>
              <td>Bs {fmt(m.balanceAfter)}</td>
              <td style="font-size:12px;color:var(--text-secondary)">{m.description || '—'}</td>
              <td><span class="badge {m.status}">{m.status}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="pagination">
        <button class="btn secondary small" disabled={mPage <= 1} onclick={() => goPage(mPage - 1)}>Anterior</button>
        <span style="font-size:13px;color:var(--text-tertiary)">Pág {mPage} de {mTotalPages}</span>
        <button class="btn secondary small" disabled={mPage >= mTotalPages} onclick={() => goPage(mPage + 1)}>Siguiente</button>
      </div>
    {/if}
  </div>
{/if}

{#if showCredit}
  <div class="modal-overlay" onclick={() => showCredit = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>Abonar saldo</h2>
      {#if creditError}<div class="error-msg">{creditError}</div>{/if}
      {#if creditSuccess}<div class="success-msg">{creditSuccess}</div>{/if}
      <form onsubmit={(e) => { e.preventDefault(); doCredit() }}>
        <div class="form-group">
          <label>Monto (BOB)</label>
          <input type="number" step="0.01" min="0.01" bind:value={creditAmount} placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Descripción (opcional)</label>
          <input type="text" bind:value={creditDesc} placeholder="Ej: Abono por servicios" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" onclick={() => showCredit = false}>Cancelar</button>
          <button type="submit" class="btn primary" disabled={crediting}>{crediting ? 'Acreditando...' : 'Acreditar'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showTransfer}
  <div class="modal-overlay" onclick={() => showTransfer = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>Transferir a otro cliente</h2>
      {#if transferMsg}<div class="success-msg">{transferMsg}</div>{/if}
      <form onsubmit={(e) => { e.preventDefault(); doTransfer() }}>
        <div class="form-group">
          <label>Cliente destino</label>
          <select bind:value={targetTenantId}>
            <option value="">Seleccionar...</option>
            {#each tenants as t}
              <option value={t.id}>{t.fullName} ({t.environment})</option>
            {/each}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" onclick={() => showTransfer = false}>Cancelar</button>
          <button type="submit" class="btn primary" disabled={transferring || !targetTenantId}>{transferring ? 'Transfiriendo...' : 'Transferir'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showPermModal}
  <div class="modal-overlay" onclick={() => showPermModal = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>Agregar usuario</h2>
      {#if permMsg}<div class="success-msg">{permMsg}</div>{/if}
      <div class="form-group">
        <label>Buscar usuario</label>
        <div style="display:flex;gap:8px">
          <input type="text" bind:value={permUserSearch} placeholder="Nombre o email..." />
          <button class="btn secondary" onclick={searchUsers} disabled={permSearching}>{permSearching ? '...' : 'Buscar'}</button>
        </div>
      </div>
      {#if permUsers.length > 0}
        <div class="card" style="max-height:200px;overflow-y:auto;padding:0;margin-bottom:8px">
          {#each permUsers as u}
            <div class="select-row" class:selected={permSelectedUserId === String(u.id)} onclick={() => { permSelectedUserId = String(u.id); permUserSearch = u.fullName; permUsers = [] }}>
              <strong>{u.fullName}</strong> <span style="color:var(--text-tertiary);font-size:12px">{u.email}</span>
            </div>
          {/each}
        </div>
      {/if}
      <div class="form-group">
        <label>Rol</label>
        <select bind:value={permSelectedRole}>
          <option value="viewer">Viewer (solo ver)</option>
          <option value="manager">Manager (operar)</option>
          <option value="owner">Owner (dueño)</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick={() => showPermModal = false}>Cancelar</button>
        <button class="btn primary" onclick={grantPermission} disabled={!permSelectedUserId}>Conceder</button>
      </div>
    </div>
  </div>
{/if}

{#if showConfirmRevoke && revokeTarget}
  <div class="modal-overlay" onclick={() => showConfirmRevoke = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width:380px">
      <h2>¿Revocar acceso?</h2>
      <p style="font-size:14px;color:var(--text-secondary);margin:8px 0">
        Se eliminará el acceso de <strong>{revokeTarget.fullName}</strong> ({revokeTarget.email}) a esta billetera.
      </p>
      <div class="modal-actions">
        <button class="btn secondary" onclick={() => showConfirmRevoke = false}>Cancelar</button>
        <button class="btn primary" style="background:var(--danger);border-color:var(--danger)" onclick={doRevoke}>Revocar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .pagination { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px 0 }
  .select-row { padding:8px 12px; cursor:pointer; border-bottom:1px solid rgba(var(--border-rgb),0.3); display:flex; justify-content:space-between; align-items:center }
  .select-row:hover { background:rgba(var(--primary-rgb),0.05) }
  .select-row.selected { background:rgba(var(--primary-rgb),0.1) }
  .select-row:last-child { border-bottom:none }
</style>
