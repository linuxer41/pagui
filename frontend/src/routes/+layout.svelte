<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Toast from '$lib/components/Toast.svelte';
  import NotificationToast from '$lib/components/NotificationToast.svelte';
  import TitleBar from '$lib/components/TitleBar.svelte';
  import { theme, type Theme } from '$lib/stores/theme';
  import { onMount } from 'svelte';
  import '../app.css';
  import { sseService } from '$lib/services/sseService';
  import AppShell from '$lib/components/layouts/AppShell.svelte';
  import AuthShell from '$lib/components/layouts/AuthShell.svelte';
  import { auth } from '$lib/stores/auth';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props()

  function resolveTheme(t: Theme): 'dark' | 'light' {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t;
  }

  async function applySystemBars(resolved: 'dark' | 'light') {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const style = resolved === 'dark' ? 'dark' : 'light';
      await invoke('plugin:system-bars|enable_edge_to_edge', { enabled: true });
      await invoke('plugin:system-bars|set_status_bar', { color: 'transparent', style });
      await invoke('plugin:system-bars|set_navigation_bar', { color: 'transparent', style });
    } catch {}
  }

  $effect(() => {
    if (!$auth.isAuthenticated && !$page.url.pathname.startsWith('/auth') && $page.url.pathname !== '/init' && $page.url.pathname !== '/support') {
      goto('/auth/login');
    }
  });

  $effect(() => {
    if (!browser) return;
    applySystemBars(resolveTheme($theme));
  });

  onMount(async () => {
    await theme.applyTheme($theme);
    sseService;
  });
</script>

<TitleBar />
<Toast />
<NotificationToast />

{#if $page.url.pathname.startsWith('/auth/') || $page.url.pathname === '/init'}
  <AuthShell>
    {@render children()}
  </AuthShell>
{:else}
  <AppShell>
    {@render children()}
  </AppShell>
{/if}
