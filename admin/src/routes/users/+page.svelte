<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let users = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')
  let search = $state('')
  let statusFilter = $state('')

  async function load() {
    loading = true; error = ''
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.listUsers(params.toString())
      if (res.success) users = res.data
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  onMount(load)
</script>

<div class="page-header">
  <h1>Usuarios</h1>
  <button class="btn primary" onclick={() => goto('/users/create')}>+ Nuevo usuario</button>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}

<div class="filters">
  <input type="text" placeholder="Buscar..." bind:value={search} oninput={load} />
  <select bind:value={statusFilter} onchange={load}>
    <option value="">Todos</option>
    <option value="active">Activos</option>
    <option value="inactive">Inactivos</option>
  </select>
</div>

{#if loading}
  <p style="color:var(--text-tertiary)">Cargando...</p>
{:else if users.length === 0}
  <div class="empty-state">No hay usuarios</div>
{:else}
  <div class="card" style="overflow-x:auto">
    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each users as u}
          <tr>
            <td><strong>{u.fullName}</strong></td>
            <td>{u.email}</td>
            <td>
              {#if u.role === 1}<span class="badge production">Super</span>
              {:else if u.role === 2}<span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary)">Admin</span>
              {:else if u.role === 3}<span>User</span>
              {:else}<span>Manager</span>
              {/if}
            </td>
            <td><span class="badge {u.status}">{u.status}</span></td>
            <td>
              <button class="btn primary small" onclick={() => goto(`/users/detail?id=${u.id}`)}>Ver</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
