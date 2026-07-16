<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import { auth } from '$lib/stores/auth'
  import { Fingerprint, ChevronRight, AlertCircle } from '@lucide/svelte'
  import PillButton from '$lib/components/ui/PillButton.svelte'
  import EmailField from '$lib/components/ui/EmailField.svelte'
  import PasswordField from '$lib/components/ui/PasswordField.svelte'

  let email = ''
  let password = ''
  let loading = false
  let error = ''
  let bioSupported = false

  onMount(() => {
    if ($auth.isAuthenticated) {
      goto('/')
    }
    bioSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential
  })

  async function handleLogin() {
    error = ''
    loading = true
    try {
      const response = await api.login(email, password)
      if (response.success) {
        goto('/', { replaceState: true })
      } else {
        error = response.message || 'Credenciales inválidas'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error de conexión'
    } finally {
      loading = false
    }
  }

  async function handleBiometricLogin() {
    if (!bioSupported) return
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 30000,
          userVerification: 'required'
        }
      })
      if (credential) {
        const response = await api.biometricLogin(credential.id)
        if (response.success) {
          goto('/', { replaceState: true })
        } else {
          error = response.message || 'Error biométrico'
        }
      }
    } catch {
      error = 'No se pudo autenticar con biometría'
    }
  }
</script>

<div class="login">
  <div class="login-hero">
    <div class="hero-icon">
      <span class="hero-icon-text">P</span>
    </div>
    <h1 class="hero-title">Iniciar sesión</h1>
    <p class="hero-subtitle">Accede a tu cuenta PAGUI</p>
  </div>

  <div class="login-body">
    {#if error}
      <div class="error-bar">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleLogin() }}>
      <EmailField bind:value={email} disabled={loading} />
      <PasswordField bind:value={password} disabled={loading} />

      <div style="margin-top: var(--space-2);">
      <PillButton type="submit" label={loading ? 'Iniciando sesión...' : 'Iniciar sesión'} {loading} fullWidth />
      </div>
    </form>

    <div class="login-links">
      <button class="text-link" onclick={() => goto('/auth/forgot-password')}>
        ¿Olvidaste tu contraseña?
      </button>
    </div>

    {#if bioSupported}
      <div class="divider"><span class="divider-text">O continúa con</span></div>
      <button class="bio-btn" onclick={handleBiometricLogin}>
        <Fingerprint size={20} />
        <span>Huella digital o Face ID</span>
      </button>
    {/if}

    <div class="register-link">
      <span>¿No tienes cuenta?</span>
      <button class="text-link" onclick={() => goto('/auth/register')}>
        Solicitar acceso <ChevronRight size={14} />
      </button>
    </div>
  </div>
</div>

<style>
  .login {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }
  .login-hero {
    background: var(--primary);
    padding: var(--space-12) var(--space-6) var(--space-8);
    text-align: center;
    color: white;
  }
  .hero-icon {
    width: 64px; height: 64px;
    border-radius: var(--radius-xl);
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto var(--space-4);
  }
  .hero-icon-text { font-size: 28px; font-weight: 800; color: white; }
  .hero-title {
    font-size: var(--text-2xl); font-weight: 800;
    letter-spacing: var(--tracking-tight); margin: 0 0 var(--space-1);
  }
  .hero-subtitle { font-size: var(--text-sm); opacity: 0.8; margin: 0; }
  .login-body {
    flex: 1;
    padding: var(--space-6) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }
  .login-body form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .error-bar {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: rgba(var(--error-rgb), 0.1);
    color: rgba(var(--error-rgb), 1);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm); font-weight: 500;
    animation: fadeIn 0.3s;
  }
  .login-links { display: flex; justify-content: center; }
  .text-link {
    background: none; border: none;
    color: var(--primary);
    cursor: pointer; font-size: var(--text-sm); font-weight: 500;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    display: inline-flex; align-items: center; gap: 2px;
  }
  .text-link:active { background: rgba(var(--primary-rgb), 0.1); }
  .divider {
    display: flex; align-items: center; gap: var(--space-3);
  }
  .divider::before, .divider::after {
    content: ''; flex: 1;
    height: 1px; background: rgba(var(--border-rgb), 0.5);
  }
  .divider-text {
    font-size: var(--text-xs);
    color: rgba(var(--text-tertiary-rgb), 1);
    white-space: nowrap;
  }
  .bio-btn {
    display: flex; align-items: center; justify-content: center;
    gap: var(--space-2);
    width: 100%; height: 48px;
    border-radius: var(--radius-pill);
    border: 1.5px solid rgba(var(--border-rgb), 1);
    background: transparent;
    color: rgba(var(--text-primary-rgb), 1);
    font-size: var(--text-sm); font-weight: 600;
    cursor: pointer;
  }
  .bio-btn:active {
    border-color: var(--primary);
    color: var(--primary);
  }
  .register-link {
    display: flex; align-items: center; justify-content: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: rgba(var(--text-secondary-rgb), 1);
    margin-top: auto;
    padding: var(--space-4) 0;
  }
</style>
