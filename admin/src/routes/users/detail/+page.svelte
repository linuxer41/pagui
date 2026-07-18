<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let user = $state<any>(null)
  let loading = $state(true)
  let error = $state('')

  const id = $derived($page.url.searchParams.get('id') || '')

  function fmt(n: number) { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n) }

  async function toggleStatus() {
    if (!user) return
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    try { await api.toggleUserStatus(id, newStatus); user.status = newStatus }
    catch (e: any) { error = e.message }
  }

  onMount(async () => {
    if (!id) { loading = false; error = 'ID no proporcionado'; return }
    loading = true; error = ''
    try {
      const res = await api.getUser(id)
      if (res.success) user = res.data
    } catch (e: any) { error = e.message }
    finally { loading = false }
  })
</script>

<div class="page-header">
  <h1>{user?.fullName || 'Cargando...'}</h1>
  <div style="display:flex;gap:8px">
    <button class="btn secondary" onclick={() => goto('/users')}>Volver</button>
    <button class="btn secondary" onclick={toggleStatus}>
      {user?.status === 'active' ? 'Desactivar' : 'Activar'}
    </button>
  </div>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if user}
  <div class="stats-grid" style="margin-bottom:20px">
    <div class="stat-card">
      <div class="stat-label">Nombre</div>
      <div class="stat-value" style="font-size:18px">{user.fullName}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Email</div>
      <div class="stat-value" style="font-size:16px">{user.email}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Teléfono</div>
      <div class="stat-value" style="font-size:16px">{user.phone || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Rol</div>
      <div style="font-size:14px">
        {#if user.role === 1}<span class="badge production">Super</span>
        {:else if user.role === 2}<span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary)">Admin</span>
        {:else if user.role === 4}<span class="badge" style="background:rgba(234,179,8,0.1);color:#eab308">Manager</span>
        {:else}<span>User</span>
        {/if}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Estado</div>
      <div><span class="badge {user.status}" style="font-size:14px">{user.status}</span></div>
    </div>
    {#if user.address}
      <div class="stat-card">
        <div class="stat-label">Dirección</div>
        <div class="stat-value" style="font-size:14px;color:var(--text-secondary)">{user.address}</div>
      </div>
    {/if}
  </div>

  <h2 style="font-size:16px;font-weight:600;margin-bottom:8px;margin-top:20px">Clientes asociados</h2>

  {#if user.tenants && user.tenants.length > 0}
    <div class="card" style="overflow-x:auto;margin-bottom:20px">
      <table class="table">
        <thead><tr><th>Nombre</th><th>Entorno</th></tr></thead>
        <tbody>
          {#each user.tenants as t}
            <tr>
              <td><a href="/tenants/detail?id={t.id}" style="color:var(--primary);text-decoration:none;font-weight:600">{t.fullName}</a></td>
              <td><span class="badge {t.environment}">{t.environment}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state">Sin clientes asociados</div>
  {/if}

  <h2 style="font-size:16px;font-weight:600;margin-bottom:8px">Billeteras</h2>

  {#if user.wallets && user.wallets.length > 0}
    <div class="card" style="overflow-x:auto">
      <table class="table">
        <thead><tr><th>Número</th><th>Nombre</th><th>Tipo</th><th>Saldo</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>
          {#each user.wallets as w}
            <tr>
              <td><a href="/wallets/detail?id={w.id}" style="color:var(--primary);text-decoration:none;font-weight:600">{w.walletNumber}</a></td>
              <td>{w.name}</td>
              <td><span class="badge" style="background:rgba(var(--primary-rgb),0.1);color:var(--primary)">{w.type}</span></td>
              <td>Bs {fmt(w.balance)}</td>
              <td><span class="badge {w.status}">{w.status}</span></td>
              <td><button class="btn primary small" onclick={() => goto(`/wallets/detail?id=${w.id}`)}>Ver</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state">Sin billeteras</div>
  {/if}
{/if}
