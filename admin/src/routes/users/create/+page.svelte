<script lang="ts">
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let fullName = $state('')
  let email = $state('')
  let password = $state('')
  let phone = $state('')
  let role = $state('3')
  let loading = $state(false)
  let error = $state('')
  let success = $state('')

  async function handleSubmit() {
    if (!fullName.trim() || !email.trim() || !password.trim()) { error = 'Completa nombre, email y contraseña'; return }
    loading = true; error = ''; success = ''
    try {
      const res = await api.createUser({ fullName: fullName.trim(), email: email.trim(), password, phone: phone.trim() || undefined, role: parseInt(role) })
      if (res.success) {
        success = 'Usuario creado exitosamente'
        setTimeout(() => goto('/users'), 1500)
      }
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }
</script>

<div class="page-header">
  <h1>Nuevo usuario</h1>
  <button class="btn secondary" onclick={() => goto('/users')}>Volver</button>
</div>

<div class="card" style="max-width:480px">
  {#if error}<div class="error-msg">{error}</div>{/if}
  {#if success}<div class="success-msg">{success}</div>{/if}
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit() }}>
    <div class="form-group">
      <label>Nombre completo</label>
      <input type="text" bind:value={fullName} placeholder="Nombre" />
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="email" bind:value={email} placeholder="email@ejemplo.com" />
    </div>
    <div class="form-group">
      <label>Contraseña</label>
      <input type="password" bind:value={password} placeholder="••••••" />
    </div>
    <div class="form-group">
      <label>Teléfono</label>
      <input type="text" bind:value={phone} placeholder="Opcional" />
    </div>
    <div class="form-group">
      <label>Rol</label>
      <select bind:value={role}>
        <option value="3">Usuario</option>
        <option value="4">Manager</option>
        <option value="2">Admin</option>
      </select>
    </div>
    <button class="btn primary" type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear usuario'}</button>
  </form>
</div>
