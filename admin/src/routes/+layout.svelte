<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth'
  import { onMount } from 'svelte'
  import '../app.css'

  let { children }: { children: import('svelte').Snippet } = $props()

  let ready = $state(false)

  onMount(() => {
    auth.subscribe(s => {
      if (!s.isAuthenticated) {
        goto('/login')
      }
    })
    ready = true
  })

  let currentPath = $derived($page.url.pathname)
  let isAuthPage = $derived(currentPath === '/login')
  let user = $derived($auth.user)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/users', label: 'Usuarios' },
    { href: '/tenants', label: 'Clientes' },
    { href: '/wallets', label: 'Billeteras' },
    { href: '/transactions', label: 'Transacciones' },
    { href: '/recaudaciones', label: 'Recaudaciones' },
    { href: '/api-keys', label: 'API Keys' },
  ]
</script>

{#if !ready}
  <div class="layout" style="align-items:center;justify-content:center"><p style="color:var(--text-tertiary)">Cargando...</p></div>
{:else if isAuthPage}
  {@render children()}
{:else if $auth.isAuthenticated}
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">PAGUI Admin</div>
      <nav class="sidebar-nav">
        {#each navItems as { href, label }}
          <button
            class="sidebar-link"
            class:active={currentPath === href || (href !== '/' && currentPath.startsWith(href))}
            onclick={() => goto(href)}
          >
            {label}
          </button>
        {/each}
      </nav>
      <div class="sidebar-footer">
        <span class="sidebar-user">{user?.fullName || user?.email}</span>
        <button class="sidebar-link" onclick={() => { auth.logout(); goto('/login') }}>Cerrar sesión</button>
      </div>
    </aside>
    <main class="main">
      {@render children()}
    </main>
  </div>
{/if}
