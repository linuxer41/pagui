<script lang="ts">
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  import { theme } from '$lib/stores/theme';
  import { onMount } from 'svelte';
  import { M3 } from "tauri-plugin-m3";
  import '../app.css';
  import { sseService } from '$lib/services/sseService';
  import { Home, ArrowLeftRight, Wallet, User, LayoutGrid } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  onMount(async () => {
    let deviceInsets = await M3.getInsets();
    if (deviceInsets && deviceInsets.adjustedInsetTop) {
      const style = document.createElement('style');
      style.innerHTML = `
        :root {
          --adjust-top: ${deviceInsets.adjustedInsetTop}px;
          --adjust-bottom: ${deviceInsets.adjustedInsetBottom}px;
        }
      `;
      document.head.appendChild(style);
    }
    await theme.applyTheme($theme);
    sseService;
  });

  let currentPath = $page.url.pathname;

  const navItems = [
    { href: '/', icon: Home, label: 'Inicio' },
    { href: '/transfers', icon: ArrowLeftRight, label: 'Transferir' },
    { href: '/wallet', icon: Wallet, label: 'Billeteras' },
    { href: '/profile', icon: User, label: 'Perfil' },
  ];
</script>

<Toast />

{#if currentPath.startsWith('/auth/') || currentPath.startsWith('/init')}
  <slot />
{:else}
  <div class="app-shell">
    <main class="app-main">
      <slot />
    </main>
    <nav class="bottom-nav">
      {#each navItems as item}
        <button
          class="nav-item"
          class:active={currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))}
          onclick={() => goto(item.href)}
        >
          <svelte:component this={item.icon} size={22} />
          <span class="nav-item-label">{item.label}</span>
        </button>
      {/each}
    </nav>
  </div>
{/if}

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
  }
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>