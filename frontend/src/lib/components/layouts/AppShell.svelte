<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { QrCode, Wallet, User, HandCoins } from '@lucide/svelte';
  import OfflineBar from '$lib/components/OfflineBar.svelte';
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { envStore } from '$lib/stores/env'
  import api from '$lib/api'
  let { children }: { children?: Snippet } = $props()

  let currentPath = $derived($page.url.pathname)
  let isMainPage = $derived(['/', '/qr', '/collections', '/profile'].includes(currentPath))
  let isSandbox = $state(true)
  let envLoaded = $state(false)

  const navItems = [
    { href: '/', icon: Wallet, label: 'Billetera' },
    { href: '/qr', icon: QrCode, label: 'QR' },
    { href: '/collections', icon: HandCoins, label: 'Recaudación' },
    { href: '/profile', icon: User, label: 'Yo' },
  ]

  onMount(async () => {
    try {
      const res = await api.listTenants()
      if (res.success && res.data && res.data.length > 0) {
        const env = res.data[0].environment || 'sandbox'
        envStore.set(env)
        isSandbox = env === 'sandbox'
        envLoaded = true
      }
    } catch {
      isSandbox = true
      envLoaded = true
    }
  })
</script>

{#if envLoaded && isSandbox}
  <div class="env-badge">Sandbox</div>
{/if}

<div class="app-shell">
  <OfflineBar />
  <main class="app-main" class:has-nav={isMainPage}>
    {#if children}{@render children()}{/if}
  </main>

  {#if isMainPage}
  <nav class="bottom-nav">
    {#each navItems as { href, icon: Icon, label }}
      <button
        class="nav-item"
        class:active={currentPath === href || (href !== '/' && currentPath.startsWith(href))}
        onclick={() => goto(href)}
      >
        <Icon size={22} />
        <span class="nav-item-label">{label}</span>
      </button>
    {/each}
  </nav>
{/if}
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    position: relative;
    background: rgba(var(--bg-rgb), 1);
    padding-top: var(--safe-top, 0px);
    
  }

  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .app-main.has-nav {
    padding-bottom: var(--safe-bottom, 0px)
  }
  .bottom-nav {
    position: sticky;
    bottom: 0px;
    
    width: 100%;
    max-width: 480px;
    padding:  var(--space-2) 0;
    padding-bottom: calc(var(--safe-bottom, 0px) + var(--space-2));
    display: flex;
    align-items: stretch;
    background: rgba(var(--bg-rgb), 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid rgba(var(--border-rgb), 0.5);
    z-index: 100;
  }
  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border: none;
    background: transparent;
    color: rgba(var(--text-tertiary-rgb), 1);
    cursor: pointer;
    transition: color var(--duration-fast);
  }
  .nav-item.active { color: var(--primary); }
  .nav-item-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .env-badge {
    position: fixed;
    top: calc(var(--safe-top, 0px) + 8px);
    right: 8px;
    z-index: 200;
    padding: 2px 10px;
    border-radius: 20px;
    background: var(--primary);
    color: var(--primary-foreground);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.5;
    box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.4);
  }
</style>
