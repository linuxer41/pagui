<script lang="ts">
  import { onMount } from 'svelte'
  import api from '$lib/api'

  let stats = $state<any>(null)
  let loading = $state(true)
  let error = $state('')

  onMount(async () => {
    try {
      const res = await api.getStats()
      if (res.success) stats = res.data
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  })
</script>

<div class="page-header"><h1>Dashboard</h1></div>

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if error}
  <div class="error-msg">{error}</div>
{:else if stats}
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Usuarios</div>
      <div class="stat-value">{stats.users?.total ?? 0}</div>
      <div class="stat-sub">
        <span style="color:var(--success)">{stats.users?.active ?? 0} activos</span>
        · <span style="color:var(--danger)">{stats.users?.inactive ?? 0} inactivos</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Clientes</div>
      <div class="stat-value">{stats.tenants?.total ?? 0}</div>
      <div class="stat-sub">
        <span style="color:var(--success)">{stats.tenants?.active ?? 0} activos</span>
        · <span style="color:var(--danger)">{stats.tenants?.inactive ?? 0} inactivos</span>
      </div>
      <div class="stat-sub" style="margin-top:4px">
        <span class="badge sandbox">{stats.tenants?.sandbox ?? 0} sandbox</span>
        <span class="badge production" style="margin-left:4px">{stats.tenants?.production ?? 0} production</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Billeteras</div>
      <div class="stat-value">{stats.wallets?.total ?? 0}</div>
      <div class="stat-sub">
        <span style="color:var(--success)">{stats.wallets?.active ?? 0} activas</span>
        · <span style="color:var(--danger)">{stats.wallets?.inactive ?? 0} inactivas</span>
      </div>
    </div>
  </div>
{/if}
