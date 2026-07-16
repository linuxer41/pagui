<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { QrCode, Home, User, Grid3X3 } from '@lucide/svelte';
  import OfflineBar from '$lib/components/OfflineBar.svelte';
  import type { Snippet } from 'svelte'
  let { children }: { children?: Snippet } = $props()

  let currentPath = $derived($page.url.pathname)
  let isMainPage = $derived(['/', '/qr', '/more', '/profile'].includes(currentPath))

  const navItems = [
    { href: '/', icon: Home, label: 'Inicio' },
    { href: '/qr', icon: QrCode, label: 'QR' },
    { href: '/more', icon: Grid3X3, label: 'Más' },
    { href: '/profile', icon: User, label: 'Yo' },
  ]
</script>

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
    max-width: 480px;
    margin: 0 auto;
    position: relative;
    background: rgba(var(--bg-rgb), 1);
  }
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .app-main.has-nav {
    padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
  }
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    height: var(--nav-height);
    display: flex;
    align-items: stretch;
    background: rgba(var(--bg-rgb), 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid rgba(var(--border-rgb), 0.5);
    padding-bottom: env(safe-area-inset-bottom, 0px);
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
</style>
