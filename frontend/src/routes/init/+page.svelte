<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { auth } from '$lib/stores/auth'
  import { APP_CONFIG } from '$lib/config'
  import { ArrowRight } from '@lucide/svelte'

  onMount(() => {
    if ($auth.isAuthenticated) { goto('/') }
  })
</script>

<div class="init-page">
  <div class="brand">
    <div class="brand-icon"><span>P</span></div>
    <h1 class="brand-name">{APP_CONFIG.appName}</h1>
    <p class="brand-tagline">Tus pagos, simplificados</p>
  </div>
  <div class="actions">
    <button class="btn-start" onclick={() => goto('/auth/login')}>Comenzar <ArrowRight size={18} /></button>
    <button class="btn-ghost" onclick={() => goto('/auth/register')}>Solicitar cuenta</button>
  </div>
  <div class="footer"><span>{APP_CONFIG.version}</span><span>&copy; {APP_CONFIG.copyrightYear}</span></div>
</div>

<style>
  .init-page { display: flex; flex-direction: column; min-height: 100dvh; background: var(--primary); padding: var(--space-8) var(--space-6); color: rgba(var(--bg-rgb), 1); max-width: 480px; margin: 0 auto; width: 100%; }
  .brand { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: var(--space-4); }
  .brand-icon { width: 88px; height: 88px; border-radius: var(--radius-2xl); background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 800; }
  .brand-name { font-size: 2.5rem; font-weight: 800; letter-spacing: var(--tracking-tight); margin: 0; }
  .brand-tagline { font-size: var(--text-base); opacity: 0.8; margin: 0; }
  .actions { display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: var(--space-8); }
  .btn-start { display: flex; align-items: center; justify-content: center; gap: var(--space-2); height: 52px; border-radius: var(--radius-lg); border: none; background: rgba(var(--bg-rgb), 1); color: var(--primary); font-size: var(--text-base); font-weight: 700; cursor: pointer; }
  .btn-start:active { opacity: 0.9; }
  .btn-ghost { height: 44px; border-radius: var(--radius-lg); border: 1px solid rgba(255,255,255,0.3); background: transparent; color: rgba(var(--bg-rgb), 1); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
  .btn-ghost:active { background: rgba(255,255,255,0.1); }
  .footer { text-align: center; font-size: var(--text-xs); opacity: 0.5; display: flex; gap: var(--space-3); justify-content: center; padding-bottom: var(--space-4); }
</style>
