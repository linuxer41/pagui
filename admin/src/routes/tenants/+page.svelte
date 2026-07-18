<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let tenants = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')
  let search = $state('')
  let envFilter = $state('')
  let statusFilter = $state('')

  async function load() {
    loading = true; error = ''
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (envFilter) params.set('environment', envFilter)
      const res = await api.listTenants(params.toString())
      if (res.success) tenants = res.data?.items || []
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  onMount(load)
</script>

<div class="page-header">
  <h1>Clientes</h1>
  <button class="btn primary" onclick={() => goto('/tenants/create')}>+ Nuevo cliente</button>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}

<div class="filters">
  <input type="text" placeholder="Buscar..." bind:value={search} oninput={load} />
  <select bind:value={statusFilter} onchange={load}>
    <option value="">Todos</option>
    <option value="active">Activos</option>
    <option value="inactive">Inactivos</option>
  </select>
  <select bind:value={envFilter} onchange={load}>
    <option value="">Todos</option>
    <option value="sandbox">Sandbox</option>
    <option value="production">Production</option>
  </select>
</div>

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if tenants.length === 0}
  <div class="empty-state">No hay clientes</div>
{:else}
  <div class="card" style="overflow-x:auto">
    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Documento</th>
          <th>Entorno</th>
          <th>Estado</th>
          <th>Dueño</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each tenants as t}
          <tr>
            <td><a href="/tenants/detail?id={t.id}" style="color:var(--primary);text-decoration:none;font-weight:600;cursor:pointer">{t.fullName}</a></td>
            <td>{t.email || '—'}</td>
            <td>{t.documentType ? `${t.documentType}: ${t.documentNumber}` : '—'}</td>
            <td><span class="badge {t.environment}">{t.environment}</span></td>
            <td><span class="badge {t.status}">{t.status}</span></td>
            <td style="font-size:12px;color:var(--text-secondary)">{t.ownerEmail || '—'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn primary small" onclick={() => goto(`/tenants/detail?id=${t.id}`)}>Ver</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
