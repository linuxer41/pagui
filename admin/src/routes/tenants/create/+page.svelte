<script lang="ts">
  import { goto } from '$app/navigation'
  import api from '$lib/api'

  let fullName = $state('')
  let email = $state('')
  let phone = $state('')
  let documentType = $state('ci')
  let documentNumber = $state('')
  let environment = $state('production')
  let loading = $state(false)
  let error = $state('')
  let success = $state('')

  async function handleSubmit() {
    if (!fullName.trim()) { error = 'Completa el nombre'; return }
    loading = true; error = ''; success = ''
    try {
      const res = await api.createTenant({
        fullName: fullName.trim(), email: email.trim() || undefined,
        phone: phone.trim() || undefined, documentType, documentNumber: documentNumber.trim() || undefined,
        environment,
      })
      if (res.success) {
        success = 'Cliente creado exitosamente'
        setTimeout(() => goto('/tenants'), 1500)
      }
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }
</script>

<div class="page-header">
  <h1>Nuevo cliente</h1>
  <button class="btn secondary" onclick={() => goto('/tenants')}>Volver</button>
</div>

<div class="card" style="max-width:480px">
  {#if error}<div class="error-msg">{error}</div>{/if}
  {#if success}<div class="success-msg">{success}</div>{/if}
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit() }}>
    <div class="form-group">
      <label>Nombre / Razón social</label>
      <input type="text" bind:value={fullName} placeholder="Nombre del cliente" />
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="email" bind:value={email} placeholder="Opcional" />
    </div>
    <div class="form-group">
      <label>Teléfono</label>
      <input type="text" bind:value={phone} placeholder="Opcional" />
    </div>
    <div class="form-group">
      <label>Tipo documento</label>
      <select bind:value={documentType}>
        <option value="ci">CI</option>
        <option value="nit">NIT</option>
        <option value="passport">Pasaporte</option>
      </select>
    </div>
    <div class="form-group">
      <label>Número documento</label>
      <input type="text" bind:value={documentNumber} placeholder="Opcional" />
    </div>
    <div class="form-group">
      <label>Entorno</label>
      <select bind:value={environment}>
        <option value="sandbox">Sandbox</option>
        <option value="production">Producción</option>
      </select>
    </div>
    <button class="btn primary" type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear cliente'}</button>
  </form>
</div>
