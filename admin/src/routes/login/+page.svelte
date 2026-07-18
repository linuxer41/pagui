<script lang="ts">
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import { auth } from '$lib/stores/auth'

  let email = $state('')
  let password = $state('')
  let loading = $state(false)
  let error = $state('')

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { error = 'Completa todos los campos'; return }
    loading = true; error = ''
    try {
      await api.login(email.trim(), password.trim())
      goto('/dashboard')
    } catch (e: any) {
      error = e.message || 'Error al iniciar sesión'
    } finally {
      loading = false
    }
  }
</script>

<div class="login-page">
  <div class="login-card">
    <h1 class="login-title">PAGUI Admin</h1>
    {#if error}<div class="error-msg">{error}</div>{/if}
    <form onsubmit={(e) => { e.preventDefault(); handleLogin() }}>
      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} placeholder="admin@pagui.com" />
      </div>
      <div class="form-group">
        <label for="password">Contraseña</label>
        <input id="password" type="password" bind:value={password} placeholder="••••••" />
      </div>
      <button class="btn primary" type="submit" disabled={loading} style="width:100%;justify-content:center">
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg);
  }
  .login-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    width: 360px;
    max-width: 90vw;
  }
  .login-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
    color: var(--primary);
  }
</style>
