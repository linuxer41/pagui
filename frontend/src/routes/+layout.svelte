<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Toast from '$lib/components/Toast.svelte';
  import { theme } from '$lib/stores/theme';
  import { onMount } from 'svelte';
  import { M3 } from "tauri-plugin-m3";
  import '../app.css';
  import { sseService } from '$lib/services/sseService';
  import AppShell from '$lib/components/layouts/AppShell.svelte';
  import AuthShell from '$lib/components/layouts/AuthShell.svelte';
  import { auth } from '$lib/stores/auth';
  import { get } from 'svelte/store';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props()

  $effect(() => {
    if (!$auth.isAuthenticated && !$page.url.pathname.startsWith('/auth') && $page.url.pathname !== '/init' && $page.url.pathname !== '/support') {
      goto('/auth/login');
    }
  });

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
</script>

<Toast />

{#if $page.url.pathname.startsWith('/auth/') || $page.url.pathname === '/init'}
  <AuthShell>
    {@render children()}
  </AuthShell>
{:else}
  <AppShell>
    {@render children()}
  </AppShell>
{/if}
