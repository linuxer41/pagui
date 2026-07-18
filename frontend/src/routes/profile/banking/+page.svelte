<script lang="ts">
  import { onMount } from 'svelte'
  import api from '$lib/api'
  import PageLayout from '$lib/components/layouts/PageLayout.svelte'
  import TextField from '$lib/components/ui/TextField.svelte'
  import PillButton from '$lib/components/ui/PillButton.svelte'
  import { Plus, Trash2, CheckCircle2, AlertCircle } from '@lucide/svelte'

  let credentials = $state<any[]>([])
  let loading = $state(true)
  let error = $state('')

  let showForm = $state(false)
  let formLoading = $state(false)
  let formError = $state('')
  let formSuccess = $state('')

  let accountHolder = $state('')
  let accountNumber = $state('')
  let merchantId = $state('')
  let username = $state('')
  let password = $state('')
  let encryptionKey = $state('')
  let environment = $state('test')
  let apiBaseUrl = $state('https://apimktdesa.baneco.com.bo/ApiGateway')

  function maskAccount(n: string) {
    if (!n || n.length < 4) return '****'
    return '**** **** **** ' + n.slice(-4)
  }

  onMount(loadCredentials)

  async function loadCredentials() {
    loading = true; error = ''
    try {
      const res = await api.listBanecoCredentials()
      if (res.success) credentials = res.data
      else error = res.message || 'Error al cargar credenciales'
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  function resetForm() {
    accountHolder = ''; accountNumber = ''; merchantId = ''; username = ''; password = ''; encryptionKey = ''; environment = 'test'; apiBaseUrl = 'https://apimktdesa.baneco.com.bo/ApiGateway'
    formError = ''; formSuccess = ''
  }

  async function handleSave() {
    if (!accountHolder || !accountNumber || !username || !password || !encryptionKey) {
      formError = 'Completa todos los campos'; return
    }
    formLoading = true; formError = ''; formSuccess = ''
    try {
      const res = await api.createBanecoCredential({
        accountHolder, accountNumber, merchantId: merchantId || `MERCH-${Date.now()}`,
        username, password, encryptionKey, environment, apiBaseUrl,
      })
      if (res.success) {
        formSuccess = 'Credencial registrada exitosamente'
        resetForm()
        showForm = false
        await loadCredentials()
      } else {
        formError = res.message || 'Error al registrar'
      }
    } catch (e: any) { formError = e.message }
    finally { formLoading = false }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta credencial?')) return
    try {
      await api.deleteBanecoCredential(id)
      await loadCredentials()
    } catch (e: any) { error = e.message }
  }

  async function handleTest() {
    if (!username || !password || !encryptionKey) { formError = 'Completa username, password y encryption key'; return }
    formLoading = true; formError = ''; formSuccess = ''
    try {
      const res = await api.testBanecoCredential({ username, password, encryptionKey })
      if (res.success) formSuccess = 'Conexión exitosa con Baneco'
      else formError = res.message || 'Error de conexión'
    } catch (e: any) { formError = e.message }
    finally { formLoading = false }
  }
</script>

<PageLayout title="Conexión Bancaria">
  {#if error}
    <div class="error-msg"><AlertCircle size={16} /><span>{error}</span></div>
  {/if}

  {#if !showForm}
    <button class="add-btn" onclick={() => { resetForm(); showForm = true }}>
      <Plus size={16} /> Agregar cuenta Baneco
    </button>
  {/if}

  {#if showForm}
    <div class="form-card">
      <h3 class="form-title">Registrar cuenta Baneco</h3>
      {#if formSuccess}
        <div class="success-msg"><CheckCircle2 size={16} /><span>{formSuccess}</span></div>
      {/if}
      {#if formError}
        <div class="error-msg"><AlertCircle size={16} /><span>{formError}</span></div>
      {/if}
      <TextField label="Titular de la cuenta" bind:value={accountHolder} placeholder="Ej: Juan Pérez" />
      <TextField label="Número de cuenta" bind:value={accountNumber} placeholder="Ej: 1041070599" />
      <TextField label="Usuario Baneco" bind:value={username} placeholder="Ej: 1649710" />
      <TextField label="Contraseña Baneco" bind:value={password} type="password" placeholder="••••" />
      <TextField label="Encryption Key" bind:value={encryptionKey} type="password" placeholder="AES Key" />
      <div class="field">
        <span class="field-label">Entorno</span>
        <div class="env-toggle">
          <button class="env-btn" class:active={environment === 'test'} onclick={() => environment = 'test'}>Test</button>
          <button class="env-btn" class:active={environment === 'prod'} onclick={() => environment = 'prod'}>Producción</button>
        </div>
      </div>
      <div class="form-actions">
        <PillButton label={formLoading ? 'Probando...' : 'Probar conexión'} onClick={handleTest} loading={formLoading} />
        <PillButton label={formLoading ? 'Guardando...' : 'Guardar'} onClick={handleSave} loading={formLoading} />
      </div>
      <button class="cancel-btn" onclick={() => showForm = false}>Cancelar</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">Cargando credenciales...</div>
  {:else if credentials.length === 0}
    <div class="empty">
      <p>No tienes cuentas bancarias conectadas.</p>
      <p class="hint">Registra tu cuenta de Banco Económico para recibir liquidaciones de tus cobros QR.</p>
    </div>
  {:else}
    <div class="cred-list">
      {#each credentials as cred}
        <div class="cred-card">
          <div class="cred-head">
            <strong>{cred.accountHolder || cred.accountName || cred.account_name}</strong>
            <span class="cred-env" class:prod={cred.environment === 'prod'}>{cred.environment === 'prod' ? 'Producción' : 'Test'}</span>
          </div>
          <div class="cred-info">
            <span class="cred-label">Cuenta</span>
            <span class="cred-value">{maskAccount(cred.account_number || cred.accountNumber || '')}</span>
          </div>
          <div class="cred-info">
            <span class="cred-label">Usuario</span>
            <span class="cred-value">{cred.username}</span>
          </div>
          <div class="cred-info">
            <span class="cred-label">Comisión</span>
            <span class="cred-value">{cred.commission_rate}%</span>
          </div>
          <div class="cred-actions">
            <button class="cred-delete" onclick={() => handleDelete(cred.id)}>
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .error-msg { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); border-radius: var(--radius-lg); font-size: var(--text-sm); }
  .success-msg { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); border-radius: var(--radius-lg); font-size: var(--text-sm); }
  .add-btn { display: flex; align-items: center; justify-content: center; gap: var(--space-2); height: 40px; border: 1px dashed var(--border); border-radius: var(--radius-m); background: transparent; color: var(--primary); font-size: var(--text-sm); cursor: pointer; width: 100%; }
  .form-card { display: flex; flex-direction: column; gap: var(--space-3); background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-4); }
  .form-title { font-size: var(--text-base); font-weight: 600; margin: 0; }
  .field { display: flex; flex-direction: column; gap: var(--space-1); }
  .field-label { font-size: var(--text-xs); font-weight: 500; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.5px; }
  .env-toggle { display: flex; gap: var(--space-2); }
  .env-btn { flex: 1; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-m); background: transparent; color: var(--muted-foreground); font-size: var(--text-sm); cursor: pointer; }
  .env-btn.active { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }
  .form-actions { display: flex; gap: var(--space-2); }
  .form-actions > :global(*) { flex: 1; }
  .cancel-btn { height: 36px; border: none; background: none; color: var(--muted-foreground); font-size: var(--text-sm); cursor: pointer; }
  .loading { text-align: center; padding: var(--space-8); color: var(--muted-foreground); }
  .empty { text-align: center; padding: var(--space-8); color: var(--muted-foreground); font-size: var(--text-sm); }
  .hint { font-size: var(--text-xs); opacity: 0.7; margin-top: var(--space-1); }
  .cred-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .cred-card { padding: var(--space-4); background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); }
  .cred-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
  .cred-env { font-size: var(--text-xs); padding: 2px var(--space-2); border-radius: var(--radius-full); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); }
  .cred-env.prod { background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
  .cred-info { display: flex; justify-content: space-between; padding: var(--space-1) 0; font-size: var(--text-sm); }
  .cred-label { color: var(--muted-foreground); }
  .cred-value { font-weight: 500; }
  .cred-actions { margin-top: var(--space-3); }
  .cred-delete { display: flex; align-items: center; gap: var(--space-1); background: none; border: none; color: rgba(var(--error-rgb), 1); font-size: var(--text-sm); cursor: pointer; padding: 0; }
</style>
