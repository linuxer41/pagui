<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let wallets = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')
  let search = $state('')
  let statusFilter = $state('')
  let typeFilter = $state('')

  async function load() {
    loading = true; error = ''
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const res = await api.listWallets(params.toString())
      if (res.success) wallets = res.data?.items || []
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  onMount(load)

  function fmt(n: number) { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) }
</script>

<div class="page-header"><h1>Billeteras</h1></div>

{#if error}<div class="error-msg">{error}</div>{/if}

<div class="filters">
  <input type="text" placeholder="Buscar..." bind:value={search} oninput={load} />
  <select bind:value={statusFilter} onchange={load}>
    <option value="">Todos</option>
    <option value="active">Activas</option>
    <option value="inactive">Inactivas</option>
  </select>
  <select bind:value={typeFilter} onchange={load}>
    <option value="">Todos</option>
    <option value="standard">Standard</option>
    <option value="business">Business</option>
  </select>
</div>

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if wallets.length === 0}
  <div class="empty-state">No hay billeteras</div>
{:else}
  <div class="card" style="overflow-x:auto">
    <table class="table">
      <thead>
        <tr>
          <th>Número</th>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Saldo</th>
          <th>Cliente</th>
          <th>Entorno</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each wallets as w}
          <tr>
            <td><a href="/wallets/detail?id={w.id}" style="color:var(--primary);text-decoration:none;font-weight:600;cursor:pointer">{w.walletNumber}</a></td>
            <td>{w.name}</td>
            <td><span class="badge" style="background:rgba(var(--primary-rgb),0.1);color:var(--primary)">{w.type}</span></td>
            <td>Bs {fmt(w.balance)}</td>
            <td style="font-size:12px">
              {#if w.tenantId && w.tenantName}
                <a href="/tenants/detail?id={w.tenantId}" style="color:var(--primary);text-decoration:none">{w.tenantName}</a>
              {:else}—{/if}
            </td>
            <td>{#if w.tenantEnvironment}<span class="badge {w.tenantEnvironment}">{w.tenantEnvironment}</span>{:else}—{/if}</td>
            <td><span class="badge {w.status}">{w.status}</span></td>
            <td>
              <button class="btn primary small" onclick={() => goto(`/wallets/detail?id=${w.id}`)}>Ver</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
