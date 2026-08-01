<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import { ArrowLeft, QrCode, Banknote, Building2, ChevronRight, AlertCircle, Check, Wallet } from '@lucide/svelte'

  let step = $state<'choose' | 'pagui' | 'baneco' | 'success'>('choose')
  let loading = $state(false)
  let error = $state('')

  let paguiOption = $state<'existente' | 'nueva' | null>(null)
  let wallets: any[] = $state([])
  let selectedWalletId = $state('')

  $effect(() => {
    if (paguiOption === 'existente' && wallets.length > 0 && !selectedWalletId) {
      selectedWalletId = String(wallets[0].id)
    }
  })

  let accountHolder = $state('')
  let accountNumber = $state('')
  let username = $state('')
  let password = $state('')
  let encryptionKey = $state('')

  onMount(async () => {
    try {
      const res = await api.getWallets()
      if (res.success) wallets = ((res.data as any[]) || []).filter((w: any) => !w.isCollection)
    } catch {}
  })

  async function activatePagui() {
    if (!paguiOption) return
    loading = true; error = ''
    try {
      if (paguiOption === 'existente') {
        if (!selectedWalletId) { error = 'Selecciona una billetera'; return }
        const res = await api.setCollectionWallet(selectedWalletId)
        if (!res.success) { error = res.message || 'Error al configurar billetera'; return }
        const cfg = await api.saveCollectionConfig({ useDefault: true, collectionType: 'gateway' })
        if (!cfg.success) { error = cfg.message || 'Error al guardar configuración'; return }
      } else {
        const res = await api.createCollectionWallet()
        if (!res.success) { error = res.message || 'Error al crear billetera'; return }
      }
      step = 'success'
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }

  async function saveBaneco() {
    if (!accountHolder.trim() || !accountNumber.trim() || !username.trim() || !password.trim() || !encryptionKey.trim()) {
      error = 'Completa todos los campos requeridos'
      return
    }
    loading = true; error = ''
    try {
      const res = await api.setupCollection({
        accountHolder: accountHolder.trim(),
        accountNumber: accountNumber.trim(),
        username: username.trim(),
        password: password.trim(),
        encryptionKey: encryptionKey.trim(),
      })
      if (!res.success) { error = res.message || 'Error al configurar recaudación'; return }
      step = 'success'
    } catch (e: any) { error = e.message }
    finally { loading = false }
  }
</script>

<div class="page">
  <div class="page-header">
    <button class="back-btn" onclick={() => step === 'choose' ? goto('/collections') : step = 'choose'}>
      <ArrowLeft size={20} />
    </button>
    <h1 class="page-title">Configurar recaudación</h1>
  </div>

  {#if error}
    <div class="error-msg"><AlertCircle size={16} /><span>{error}</span></div>
  {/if}

  {#if step === 'choose'}
    <p class="desc">Selecciona cómo quieres recibir tus cobros automatizados:</p>

    <div class="options">
      <button class="option-card" onclick={() => step = 'pagui'}>
        <div class="option-icon" style="background:rgba(16,185,129,0.15);color:rgba(16,185,129,1)">
          <QrCode size={28} />
        </div>
        <div class="option-body">
          <strong class="option-title">PAGUI Gateway</strong>
          <span class="option-desc">Todo listo y automatizado. Genera QR, recibe pagos y concilia sin configuración adicional.</span>
          <span class="option-badge">Recomendado</span>
        </div>
        <ChevronRight size={20} class="option-chevron" />
      </button>

      <button class="option-card" onclick={() => step = 'baneco'}>
        <div class="option-icon" style="background:rgba(79,70,229,0.15);color:rgba(79,70,229,1)">
          <Building2 size={28} />
        </div>
        <div class="option-body">
          <strong class="option-title">Banco Económico</strong>
          <span class="option-desc">Usa tu cuenta bancaria. Debes solicitar tus credenciales en el Banco Económico e ingresarlas aquí.</span>
          <span class="option-badge">Conexión directa</span>
        </div>
        <ChevronRight size={20} class="option-chevron" />
      </button>
    </div>

  {:else if step === 'pagui'}
    <div class="pagui-section">
      <div class="pagui-header">
        <div class="pagui-icon"><QrCode size={24} /></div>
        <h2 class="pagui-title">PAGUI Gateway</h2>
        <p class="pagui-desc">Selecciona qué billetera usarás para recibir recaudaciones:</p>
      </div>

      <label class="pagui-option" class:active={paguiOption === 'existente'}>
        <input type="radio" bind:group={paguiOption} value="existente" />
        <div class="pagui-option-icon" style="background:rgba(16,185,129,0.15);color:rgba(16,185,129,1)">
          <Wallet size={22} />
        </div>
        <div class="pagui-option-text">
          <strong>Usar mi billetera actual</strong>
          <span>Convierte una de tus billeteras existentes para recibir cobros.</span>
        </div>
      </label>

      {#if paguiOption === 'existente'}
        <div class="pagui-wallets">
          {#if wallets.length === 0}
            <p class="no-wallets">No tienes billeteras disponibles.</p>
          {:else}
            {#each wallets as w}
              <label class="wallet-item" class:selected={selectedWalletId === String(w.id)}>
                <input type="radio" name="existing-wallet" bind:group={selectedWalletId} value={String(w.id)} />
                <div class="wallet-info">
                  <strong>{w.name || 'Mi Wallet'}</strong>
                  <span>{w.wallet_number || w.walletNumber} · {w.currency || 'BOB'}</span>
                </div>
              </label>
            {/each}
          {/if}
        </div>
      {/if}

      <label class="pagui-option" class:active={paguiOption === 'nueva'}>
        <input type="radio" bind:group={paguiOption} value="nueva" />
        <div class="pagui-option-icon" style="background:rgba(79,70,229,0.15);color:rgba(79,70,229,1)">
          <QrCode size={22} />
        </div>
        <div class="pagui-option-text">
          <strong>Crear nueva exclusiva para recaudación</strong>
          <span>Genera una billetera nueva dedicada solo a recibir cobros.</span>
        </div>
      </label>

      <button class="cta-btn" onclick={activatePagui} disabled={!paguiOption || loading}>
        {loading ? 'Activando...' : paguiOption === 'existente' ? 'Usar esta billetera' : 'Crear y activar'}
      </button>
      <button class="link-btn" onclick={() => step = 'choose'}>Volver</button>
    </div>

  {:else if step === 'baneco'}
    <div class="form-section">
      <p class="form-desc">Ingresa los datos que te proporcionó el Banco Económico:</p>

      <div class="field">
        <label class="field-label">Titular de la cuenta</label>
        <input class="text-input" type="text" bind:value={accountHolder} placeholder="Ej: Juan Pérez" autofocus />
      </div>

      <div class="field">
        <label class="field-label">Número de cuenta</label>
        <input class="text-input" type="text" bind:value={accountNumber} placeholder="Ej: 1041070599" />
      </div>

      <div class="field">
        <label class="field-label">Usuario del API Baneco</label>
        <input class="text-input" type="text" bind:value={username} placeholder="Usuario que te asignó el banco" />
      </div>

      <div class="field">
        <label class="field-label">Contraseña del API Baneco</label>
        <input class="text-input" type="password" bind:value={password} placeholder="Contraseña que te asignó el banco" />
      </div>

      <div class="field">
        <label class="field-label">Encryption Key</label>
        <input class="text-input" type="text" bind:value={encryptionKey} placeholder="Clave de encriptación AES" />
        <p class="field-note">Clave proporcionada por el Banco Económico.</p>
      </div>

      <p class="form-note">El servidor configurará automáticamente el entorno de pruebas y la URL del API.</p>

      <button class="cta-btn" onclick={saveBaneco} disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar y activar recaudación'}
      </button>
      <button class="link-btn" onclick={() => step = 'choose'}>Volver</button>
    </div>

  {:else if step === 'success'}
    <div class="success-card">
      <div class="success-icon"><Check size={40} /></div>
      <h2 class="success-title">Recaudación activada</h2>
      <p class="success-desc">Tu billetera de recaudación está lista. Ya puedes empezar a recibir cobros automatizados.</p>
      <button class="cta-btn" onclick={() => goto('/collections')}>
        Ir a recaudaciones
      </button>
    </div>
  {/if}
</div>

<style>
  .page { flex: 1; padding: var(--space-4); padding-top: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
  .page-header { display: flex; align-items: center; gap: var(--space-3); }
  .back-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-xl); border: none; background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); cursor: pointer; flex-shrink: 0; }
  .page-title { font-size: var(--text-xl); font-weight: 700; letter-spacing: var(--tracking-tight); color: rgba(var(--text-primary-rgb), 1); }
  .error-msg { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); border-radius: var(--radius-lg); font-size: var(--text-sm); }
  .desc { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; line-height: 1.5; }

  .options { display: flex; flex-direction: column; gap: var(--space-3); }
  .option-card { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); border: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; text-align: left; width: 100%; transition: border-color var(--duration-fast); }
  .option-card:active { border-color: var(--primary); }
  .option-icon { width: 52px; height: 52px; border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .option-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .option-title { font-size: var(--text-base); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); }
  .option-desc { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); line-height: 1.4; }
  .option-badge { display: inline-block; margin-top: var(--space-1); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: var(--radius-full); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); width: fit-content; }
  .option-chevron { color: rgba(var(--text-tertiary-rgb), 1); flex-shrink: 0; }

  .form-section { display: flex; flex-direction: column; gap: var(--space-4); }
  .form-desc { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; }
  .field { display: flex; flex-direction: column; gap: var(--space-1); }
  .field-label { font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-secondary-rgb), 1); text-transform: uppercase; letter-spacing: 0.04em; }
  .text-input { width: 100%; padding: var(--space-3) var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.5); border-radius: var(--radius-lg); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); outline: none; box-sizing: border-box; }
  .text-input:focus { border-color: var(--primary); }
  .rate-input-wrap { position: relative; display: flex; align-items: center; }
  .rate-input { padding-right: 2.5rem; }
  .rate-suffix { position: absolute; right: 1rem; font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); font-weight: 600; pointer-events: none; }
  .field-note { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; line-height: 1.4; }
  .form-note { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; line-height: 1.4; }

  .pagui-section { display: flex; flex-direction: column; gap: var(--space-4); }
  .pagui-header { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); text-align: center; }
  .pagui-icon { width: 56px; height: 56px; border-radius: var(--radius-2xl); background: rgba(16,185,129,0.15); color: rgba(16,185,129,1); display: flex; align-items: center; justify-content: center; }
  .pagui-title { font-size: var(--text-lg); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .pagui-desc { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; }
  .pagui-option { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); border: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; }
  .pagui-option.active { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
  .pagui-option input { margin-top: 4px; accent-color: var(--primary); }
  .pagui-option-icon { width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pagui-option-text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .pagui-option-text strong { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .pagui-option-text span { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }
  .pagui-wallets { display: flex; flex-direction: column; gap: var(--space-2); padding-left: var(--space-9); }
  .no-wallets { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); text-align: center; padding: var(--space-2); }
  .wallet-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; }
  .wallet-item.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
  .wallet-item input { accent-color: var(--primary); }
  .wallet-info { display: flex; flex-direction: column; gap: 1px; }
  .wallet-info strong { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .wallet-info span { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }

  .cta-btn { width: 100%; padding: var(--space-4); border: none; border-radius: var(--radius-xl); background: var(--primary); color: var(--primary-foreground); font-size: var(--text-base); font-weight: 700; cursor: pointer; text-align: center; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cta-btn:active { opacity: 0.8; }
  .link-btn { background: none; border: none; color: var(--primary); font-size: var(--text-sm); font-weight: 600; cursor: pointer; padding: var(--space-2); text-align: center; }

  .success-card { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); text-align: center; padding: var(--space-8) var(--space-4); }
  .success-icon { width: 80px; height: 80px; border-radius: var(--radius-full); background: rgba(16,185,129,0.15); color: rgba(16,185,129,1); display: flex; align-items: center; justify-content: center; }
  .success-title { font-size: var(--text-2xl); font-weight: 800; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .success-desc { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; max-width: 280px; }
</style>