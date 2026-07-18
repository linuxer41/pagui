<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import { Calendar, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, HandCoins, AlertCircle, QrCode, Percent, ArrowRight, Code, Webhook, Landmark, Check } from '@lucide/svelte'
  import WalletInfo from '$lib/components/composite/WalletInfo.svelte'

  let hasWallet = $state<boolean | null>(null)
  let wallet: any = $state(null)
  let pendingTotal = $state(0)
  let loading = $state(true)
  let creating = $state(false)
  let error = $state('')

  let allWallets: any[] = $state([])
  let statsLoading = $state(false)
  let selectedPeriodType = $state<'weekly' | 'monthly' | 'yearly'>('monthly')
  let selectedYear = $state(new Date().getFullYear())
  let selectedMonth = $state(new Date().getMonth())
  let selectedWeek = $state(getCurrentWeek())
  let showYearSelector = $state(false)
  let statsTotal = $state(0)
  let config: any = $state(null)
  let bankAccounts: any[] = $state([])
  let banks: {code: string; name: string}[] = $state([])
  let destMode = $state<'pagui' | 'bank'>('pagui')
  let autoFreq = $state<'daily' | 'weekly' | 'monthly' | 'manual'>('weekly')
  let showDestConfig = $state(false)
  let savingDest = $state(false)
  let showAddBank = $state(false)
  let selectedBankCode = $state('')
  let newBankHolder = $state('')
  let newBankAccount = $state('')
  let newBankCi = $state('')

  let showWithdraw = $state(false)
  let withdrawAmount = $state(0.01)
  let withdrawBankId = $state('')
  let withdrawing = $state(false)

  let showHistory = $state(false)
  let history = $state<any[]>([])
  let historyLoading = $state(false)

  let directPendingTotal = $state(0)
  let directPendingItems = $state<any[]>([])
  let directLoading = $state(false)

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  function getCurrentWeek(): number {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil(days / 7)
  }

  function getMonthName(m: number): string {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m]
  }

  onMount(() => { load() })

  async function load() {
    loading = true; error = ''
    try {
      const [accRes, acctsRes, pRes] = await Promise.all([
        api.getCollectionWallet(),
        api.getWallets(),
        api.getPendingSettlements(),
      ])
      if (accRes.success) { hasWallet = !!accRes.data; wallet = accRes.data }
      if (acctsRes.success) allWallets = (acctsRes.data as any[] || []).filter((a: any) => !a.isCollection)
      if (pRes.success) pendingTotal = (pRes.data as any)?.pendingTotal || 0
    } catch (e: any) { error = e.message }
    finally { loading = false }

    if (hasWallet && wallet?.id) {
      await loadStats()
      await loadConfig()
    }
  }

  async function loadConfig() {
    try {
      const [cfgRes, acctsRes, banksRes] = await Promise.all([
        api.getCollectionConfig(),
        api.listBankAccounts(),
        api.listBanks(),
      ])
      if (cfgRes.success) {
        config = cfgRes.data
        destMode = config?.bankAccountId ? 'bank' : 'pagui'
      }
      if (acctsRes.success) bankAccounts = (acctsRes.data as any[]) || []
      if (banksRes.success) banks = (banksRes.data as any[]) || []
      if (config?.collectionType === 'direct') await loadDirectData()
    } catch {}
  }

  async function saveDestConfig() {
    savingDest = true; error = ''
    try {
      if (destMode === 'pagui') {
        await api.saveCollectionConfig({ useDefault: true, banecoCredentialId: null, bankAccountId: null, autoTransferFreq: null })
      } else {
        if (!bankAccounts.length) {
          error = 'Primero vincula una cuenta bancaria antes de seleccionar esta opción'
          savingDest = false
          return
        }
        const baId = config?.bankAccountId || bankAccounts[0]?.id
        await api.saveCollectionConfig({ useDefault: false, banecoCredentialId: null, bankAccountId: String(baId), autoTransferFreq: autoFreq })
      }
      showDestConfig = false
      await loadConfig()
    } catch (e: any) { error = e.message }
    finally { savingDest = false }
  }

  async function handleAddBank() {
    if (!selectedBankCode || !newBankHolder.trim() || !newBankAccount.trim() || !newBankCi.trim()) {
      error = 'Selecciona un banco y completa todos los campos'
      return
    }
    try {
      const res = await api.createBankAccount({
        bankCode: selectedBankCode,
        accountHolder: newBankHolder.trim(),
        accountNumber: newBankAccount.trim(),
        holderDocument: newBankCi.trim(),
      })
      if (res.success) {
        await loadConfig()
        showAddBank = false
        selectedBankCode = ''; newBankHolder = ''; newBankAccount = ''; newBankCi = ''
        destMode = 'bank'
      } else { error = res.message || 'Error al guardar' }
    } catch (e: any) { error = e.message }
  }

  async function loadStats() {
    if (!wallet?.id) return
    try {
      const res: any = await api.getCollectionsStats(selectedPeriodType, selectedYear, selectedMonth, selectedPeriodType === 'weekly' ? selectedWeek : undefined, wallet.id)
      const payload = res.data || res
      statsTotal = payload.summary?.total || 0
    } catch {}
  }

  function changePeriod(type: 'weekly' | 'monthly' | 'yearly') { selectedPeriodType = type; loadStats() }

  function navigatePeriod(dir: 'prev' | 'next') {
    if (selectedPeriodType === 'monthly') {
      if (dir === 'prev') { if (selectedMonth === 0) { selectedMonth = 11; selectedYear-- } else selectedMonth-- }
      else { if (selectedMonth === 11) { selectedMonth = 0; selectedYear++ } else selectedMonth++ }
    } else if (selectedPeriodType === 'weekly') {
      if (dir === 'prev') { if (selectedWeek === 1) { selectedWeek = 52; selectedYear-- } else selectedWeek-- }
      else { if (selectedWeek === 52) { selectedWeek = 1; selectedYear++ } else selectedWeek++ }
    } else dir === 'prev' ? selectedYear-- : selectedYear++
    loadStats()
  }

  function selectYear(year: number) { selectedYear = year; showYearSelector = false; loadStats() }

  async function handleWithdraw() {
    if (!withdrawBankId) { error = 'Selecciona una cuenta bancaria'; return }
    if (withdrawAmount < 0.01) { error = 'El monto mínimo es 0.01 BOB'; return }
    if (withdrawAmount > pendingTotal) { error = 'El monto excede el saldo pendiente'; return }
    withdrawing = true; error = ''
    try {
      const res = await api.createManualLiquidation({ bankAccountId: withdrawBankId, amount: withdrawAmount })
      if (res.success) {
        showWithdraw = false
        withdrawAmount = 0.01; withdrawBankId = ''
        await load()
      } else { error = res.message || 'Error al procesar retiro' }
    } catch (e: any) { error = e.message }
    finally { withdrawing = false }
  }

  async function loadHistory() {
    historyLoading = true
    try {
      const res = await api.listLiquidations()
      if (res.success) history = (res.data as any)?.settlements || []
    } catch {}
    finally { historyLoading = false }
  }

  function openHistory() {
    showHistory = true
    loadHistory()
  }

  async function loadDirectData() {
    directLoading = true
    try {
      const res = await api.getPendingDirectCommissions()
      if (res.success) {
        const d = res.data as any
        directPendingTotal = d.pendingTotal || 0
        directPendingItems = d.items || []
      }
    } catch {}
    finally { directLoading = false }
  }

  function openDirectHistory() {
    showHistory = true
    loadHistory()
  }

  function formatAmount(n: number, cur = 'BOB') {
    const f = n.toLocaleString('es-BO', { minimumFractionDigits: 2 })
    return cur === 'BOB' ? `Bs ${f}` : `$${f}`
  }

</script>

<div class="page">
  <div class="page-header">
    <h1 class="page-title">Recaudaciones</h1>
    <p class="page-sub">Cobros recibidos y liquidaciones</p>
  </div>

  {#if error}
    <div class="error-msg"><AlertCircle size={16} /><span>{error}</span></div>
  {/if}

  {#if loading}
    <div class="loading">Cargando...</div>

  {:else if hasWallet === false}
    <div class="onboarding">
      <div class="onboarding-icon"><HandCoins size={32} /></div>
      <h2 class="onboarding-title">Activa tus recaudaciones</h2>
      <p class="onboarding-desc">Vincula tu sistema de ventas y recibe cobros de forma automática. Transfiere tu saldo a Baneco sin mover un dedo.</p>
      <div class="benefits">
        <div class="benefit">
          <QrCode size={18} style="color:rgba(16,185,129,1);flex-shrink:0;margin-top:1px" />
          <div class="benefit-body">
            <strong>Vincula tu sistema de ventas</strong>
            <span>Generación automática de QR para cobrar en tu comercio, tienda online o punto de venta.</span>
          </div>
        </div>
        <div class="benefit">
          <ArrowRight size={18} style="color:rgba(79,70,229,1);flex-shrink:0;margin-top:1px" />
          <div class="benefit-body">
            <strong>Integración con tus sistemas</strong>
            <span>Conecta con los sistemas que ya usas para autorizar y conciliar pagos sin intervención manual.</span>
          </div>
        </div>
        <div class="benefit">
          <Percent size={18} style="color:rgba(245,158,11,1);flex-shrink:0;margin-top:1px" />
          <div class="benefit-body">
            <strong>Automatiza tu recaudación</strong>
            <span>Comisión del 0.01% por transacción — solo para mantenimiento de la app. Liquidación directa a Baneco.</span>
          </div>
        </div>
      </div>

      <button class="cta-btn" onclick={() => goto('/collections/create')}>
          Configurar
        </button>
    </div>

  {:else}
    {#if config?.collectionType === 'direct'}
      <!-- === Baneco Direct === -->
      <div class="period-type-selector">
        <button class="period-btn" class:active={selectedPeriodType === 'weekly'} onclick={() => changePeriod('weekly')}><Clock size={16} /><span>Semanal</span></button>
        <button class="period-btn" class:active={selectedPeriodType === 'monthly'} onclick={() => changePeriod('monthly')}><Calendar size={16} /><span>Mensual</span></button>
        <button class="period-btn" class:active={selectedPeriodType === 'yearly'} onclick={() => changePeriod('yearly')}><CalendarDays size={16} /><span>Anual</span></button>
      </div>

      <div class="period-navigator">
        <button class="nav-btn" onclick={() => navigatePeriod('prev')}><ChevronLeft size={18} /></button>
        <div class="current-period">
          <button class="year-selector" onclick={() => showYearSelector = !showYearSelector}>
            {selectedPeriodType === 'monthly' ? `${getMonthName(selectedMonth)} ${selectedYear}` : selectedPeriodType === 'weekly' ? `Semana ${selectedWeek}, ${selectedYear}` : `${selectedYear}`}
            <ChevronDown size={14} />
          </button>
          {#if showYearSelector}
            <div class="year-dropdown">
              {#each yearOptions as year}
                <button class="year-option" class:selected={year === selectedYear} onclick={() => selectYear(year)}>{year}</button>
              {/each}
            </div>
          {/if}
        </div>
        <button class="nav-btn" onclick={() => navigatePeriod('next')}><ChevronRight size={18} /></button>
      </div>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Total recaudado ({selectedPeriodType === 'monthly' ? getMonthName(selectedMonth) : selectedPeriodType === 'weekly' ? `Semana ${selectedWeek}` : ''} {selectedYear})</span>
          <span class="summary-number">{formatAmount(statsTotal)}</span>
        </div>
      </div>

      {#if directPendingTotal > 0}
        <div class="commission-card">
          <div class="commission-header">
            <div class="commission-icon"><Percent size={18} /></div>
            <div class="commission-info">
              <strong class="commission-label">Comisiones por cobrar</strong>
              <span class="commission-total">{formatAmount(directPendingTotal)}</span>
            </div>
          </div>
          <div class="commission-list">
            {#each directPendingItems as item}
              <div class="commission-item">
                <div class="commission-item-info">
                  <span class="commission-item-ref">{item.reference || `#${item.id}`}</span>
                  <span class="commission-item-detail">{formatAmount(item.grossAmount)} · {item.commissionRate}% comisión</span>
                </div>
                <span class="commission-item-value">{formatAmount(item.commission)}</span>
              </div>
            {/each}
          </div>
        </div>
      {:else if !directLoading}
        <div class="empty-state">No hay comisiones pendientes por cobrar.</div>
      {/if}

      <div class="menu-group"><div class="menu-title">Integraciones</div>
        <button class="menu-item" onclick={openDirectHistory}><div class="menu-icon" style="background:rgba(245,158,11,0.15);color:rgba(245,158,11,1)"><Percent size={18} /></div><div class="menu-text"><span class="menu-label">Comisiones pendientes</span><span class="menu-desc">Saldo a favor de PAGUI por cobrar</span></div></button>
        <button class="menu-item" onclick={() => goto('/profile/api-keys')}><div class="menu-icon" style="background:rgba(var(--info-rgb),0.15);color:rgba(var(--info-rgb),1)"><Code size={18} /></div><div class="menu-text"><span class="menu-label">API Keys</span><span class="menu-desc">Gestiona tus claves de integración</span></div></button>
        <button class="menu-item" onclick={() => goto('/webhooks')}><div class="menu-icon" style="background:rgba(124,58,237,0.15);color:rgba(124,58,237,1)"><Webhook size={18} /></div><div class="menu-text"><span class="menu-label">Webhooks</span><span class="menu-desc">Integraciones API</span></div></button>
      </div>

    {:else}
      <!-- === PAGUI Gateway === -->
      <WalletInfo {wallet} />

      <div class="period-type-selector">
        <button class="period-btn" class:active={selectedPeriodType === 'weekly'} onclick={() => changePeriod('weekly')}><Clock size={16} /><span>Semanal</span></button>
        <button class="period-btn" class:active={selectedPeriodType === 'monthly'} onclick={() => changePeriod('monthly')}><Calendar size={16} /><span>Mensual</span></button>
        <button class="period-btn" class:active={selectedPeriodType === 'yearly'} onclick={() => changePeriod('yearly')}><CalendarDays size={16} /><span>Anual</span></button>
      </div>

      <div class="period-navigator">
        <button class="nav-btn" onclick={() => navigatePeriod('prev')}><ChevronLeft size={18} /></button>
        <div class="current-period">
          <button class="year-selector" onclick={() => showYearSelector = !showYearSelector}>
            {selectedPeriodType === 'monthly' ? `${getMonthName(selectedMonth)} ${selectedYear}` : selectedPeriodType === 'weekly' ? `Semana ${selectedWeek}, ${selectedYear}` : `${selectedYear}`}
            <ChevronDown size={14} />
          </button>
          {#if showYearSelector}
            <div class="year-dropdown">
              {#each yearOptions as year}
                <button class="year-option" class:selected={year === selectedYear} onclick={() => selectYear(year)}>{year}</button>
              {/each}
            </div>
          {/if}
        </div>
        <button class="nav-btn" onclick={() => navigatePeriod('next')}><ChevronRight size={18} /></button>
      </div>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Pendiente por liquidar</span>
          <div class="summary-value-row">
            <span class="summary-number">{formatAmount(pendingTotal)}</span>
            {#if pendingTotal > 0 && bankAccounts.length > 0}
              <button class="withdraw-btn" onclick={() => showWithdraw = true}>Retirar</button>
            {/if}
          </div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-row">
          <span class="summary-label">Total recaudado ({selectedPeriodType === 'monthly' ? getMonthName(selectedMonth) : selectedPeriodType === 'weekly' ? `Semana ${selectedWeek}` : ''} {selectedYear})</span>
          <span class="summary-number">{formatAmount(statsTotal)}</span>
        </div>
      </div>

      <div class="dest-section">
        <button class="dest-header" onclick={() => showDestConfig = !showDestConfig}>
        <div class="dest-header-left">
          <Landmark size={18} style="color:var(--primary)" />
          <span class="dest-label">Destino de liquidaciones</span>
        </div>
        <div class="dest-header-right">
          <span class="dest-mode">{destMode === 'bank' ? 'Cuenta bancaria' : 'Saldo en PAGUI'}</span>
          <ChevronDown size={16} style="transform:rotate({showDestConfig ? 180 : 0}deg);transition:transform var(--duration-fast)" />
        </div>
      </button>

      {#if showDestConfig}
        <div class="dest-body">
          <p class="dest-desc">Elige dónde quieres recibir tu dinero:</p>

          <label class="dest-option" class:active={destMode === 'pagui'}>
            <input type="radio" bind:group={destMode} value="pagui" />
            <div class="dest-option-icon" style="background:rgba(16,185,129,0.15);color:rgba(16,185,129,1)">
              <Check size={20} />
            </div>
            <div class="dest-option-text">
              <strong>Mantener saldo en PAGUI</strong>
              <span>El dinero se acredita en tu billetera digital. Mínimo 10 Bs para retirar.</span>
            </div>
          </label>

          <label class="dest-option" class:active={destMode === 'bank'}>
            <input type="radio" bind:group={destMode} value="bank" />
            <div class="dest-option-icon" style="background:rgba(79,70,229,0.15);color:rgba(79,70,229,1)">
              <Landmark size={20} />
            </div>
            <div class="dest-option-text">
              <strong>Transferir a mi banco</strong>
              <span>Los cobros se transfieren periódicamente a tu cuenta bancaria.</span>
            </div>
          </label>

          {#if destMode === 'bank'}
            {#if bankAccounts.length > 0}
              <div class="bank-list">
                {#each bankAccounts as acct}
                  <div class="bank-item">
                    <div class="bank-info">
                      <span class="bank-name">{banks.find(b => b.code === acct.bankCode)?.name || acct.bankCode}</span>
                      <span class="bank-detail">{acct.accountHolder} · {acct.accountNumber}</span>
                    </div>
                  </div>
                {/each}
              </div>

              <div class="freq-section">
                <p class="freq-label">Transferencia automática:</p>
                <div class="freq-options">
                  {#each [{ v: 'daily' as const, l: 'Cada día' }, { v: 'weekly' as const, l: 'Cada semana' }, { v: 'monthly' as const, l: 'Cada mes' }, { v: 'manual' as const, l: 'Manual' }] as opt}
                    <button class="freq-btn" class:active={autoFreq === opt.v} onclick={() => autoFreq = opt.v}>
                      {opt.l}
                    </button>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="no-bank">
                <p class="no-bank-text">No tienes cuentas bancarias vinculadas.</p>
                <button class="dashed-btn" onclick={async () => { if (!banks.length) await loadConfig(); showAddBank = true }}>
                  + Vincular cuenta bancaria
                </button>
              </div>
            {/if}
          {/if}

          <div class="dest-actions">
            <button class="cta-btn" onclick={saveDestConfig} disabled={savingDest}>
              {savingDest ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      {/if}
    </div>

    <div class="menu-group"><div class="menu-title">Integraciones</div>
      <button class="menu-item" onclick={openHistory}><div class="menu-icon" style="background:rgba(245,158,11,0.15);color:rgba(245,158,11,1)"><Clock size={18} /></div><div class="menu-text"><span class="menu-label">Historial de retiros</span><span class="menu-desc">Liquidaciones enviadas a tu banco</span></div></button>
      <button class="menu-item" onclick={() => goto('/profile/api-keys')}><div class="menu-icon" style="background:rgba(var(--info-rgb),0.15);color:rgba(var(--info-rgb),1)"><Code size={18} /></div><div class="menu-text"><span class="menu-label">API Keys</span><span class="menu-desc">Gestiona tus claves de integración</span></div></button>
      <button class="menu-item" onclick={() => goto('/webhooks')}><div class="menu-icon" style="background:rgba(124,58,237,0.15);color:rgba(124,58,237,1)"><Webhook size={18} /></div><div class="menu-text"><span class="menu-label">Webhooks</span><span class="menu-desc">Integraciones API</span></div></button>
    </div>
  {/if}
{/if}
</div>

{#if showAddBank}
  <div class="modal-overlay" onclick={() => showAddBank = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Vincular cuenta bancaria</h3>
        <button class="modal-close" onclick={() => showAddBank = false}>×</button>
      </div>
      <div class="modal-body">
        <div class="bank-selector">
          <p class="bank-selector-label">Selecciona el banco:</p>
          <div class="bank-selector-grid">
            {#each banks as bank}
              <button class="bank-option" class:active={selectedBankCode === bank.code} onclick={() => selectedBankCode = bank.code}>
                <span class="bank-option-code">{bank.code}</span>
                <span class="bank-option-name">{bank.name}</span>
              </button>
            {/each}
          </div>
        </div>
        <input class="text-input" type="text" bind:value={newBankHolder} placeholder="Titular de la cuenta" />
        <input class="text-input" type="text" bind:value={newBankAccount} placeholder="Número de cuenta" />
        <input class="text-input" type="text" bind:value={newBankCi} placeholder="CI / NIT del titular" />
      </div>
      <div class="modal-footer">
        <button class="link-btn" onclick={() => showAddBank = false}>Cancelar</button>
        <button class="cta-btn small" onclick={handleAddBank}>
          Guardar cuenta
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { flex: 1; padding: var(--space-4); padding-top: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
  .page-header { margin-bottom: 0; }
  .page-title { font-size: var(--text-xl); font-weight: 700; letter-spacing: var(--tracking-tight); color: rgba(var(--text-primary-rgb), 1); }
  .page-sub { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); margin-top: var(--space-1); }
  .error-msg { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); border-radius: var(--radius-lg); font-size: var(--text-sm); }
  .loading { text-align: center; padding: var(--space-8); color: var(--muted-foreground); }

  .onboarding { display: flex; flex-direction: column; align-items: center; gap: var(--space-5); text-align: center; padding: var(--space-6) 0; }
  .onboarding-icon { width: 64px; height: 64px; border-radius: var(--radius-2xl); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; }
  .onboarding-title { font-size: var(--text-xl); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .onboarding-desc { font-size: var(--text-sm); color: rgba(var(--text-tertiary-rgb), 1); max-width: 300px; margin: 0; }
  .benefits { display: flex; flex-direction: column; gap: var(--space-4); width: 100%; text-align: left; padding: var(--space-2) 0; }
  .benefit { display: flex; align-items: flex-start; gap: var(--space-3); font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); line-height: 1.5; }
  .benefit-body { display: flex; flex-direction: column; gap: 2px; }
  .benefit-body strong { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .benefit-body span { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }
  .cta-btn { width: 100%; padding: var(--space-4); border: none; border-radius: var(--radius-xl); background: var(--primary); color: var(--primary-foreground); font-size: var(--text-base); font-weight: 700; cursor: pointer; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cta-btn:active { opacity: 0.8; }
  .cta-btn.outline { background: transparent; border: 1px solid var(--primary); color: var(--primary); }
  .onboarding-actions { display: flex; flex-direction: column; gap: var(--space-3); width: 100%; }
  .link-btn { background: none; border: none; color: var(--primary); font-size: var(--text-sm); font-weight: 600; cursor: pointer; padding: var(--space-2); }
  .pick-section { width: 100%; display: flex; flex-direction: column; gap: var(--space-3); }
  .pick-title { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); margin: 0; text-align: left; }
  .pick-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .pick-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-xl); border: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; }
  .pick-item.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.05); }
  .pick-item input { accent-color: var(--primary); }
  .pick-info { display: flex; flex-direction: column; gap: 1px; text-align: left; }
  .pick-info strong { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .pick-info span { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }

  .summary-card { background: var(--primary); color: var(--primary-foreground); border-radius: var(--radius-xl); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .summary-row { display: flex; flex-direction: column; gap: var(--space-1); }
  .summary-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }
  .summary-number { font-size: var(--text-2xl); font-weight: 800; letter-spacing: var(--tracking-tight); }
  .summary-divider { height: 1px; background: rgba(255,255,255,0.2); }

  .period-type-selector { display: flex; gap: var(--space-2); background: rgba(var(--surface-rgb), 0.5); border-radius: var(--radius-lg); padding: var(--space-1); }
  .period-btn { display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: none; border: none; color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-sm); font-weight: 500; flex: 1; cursor: pointer; }
  .period-btn.active { background: rgba(var(--surface-rgb), 1); color: var(--primary); }
  .period-navigator { display: flex; align-items: center; justify-content: space-between; background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); padding: var(--space-2) var(--space-3); }
  .nav-btn { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: var(--radius-md); background: none; border: none; color: rgba(var(--text-secondary-rgb), 1); cursor: pointer; }
  .nav-btn:active { background: rgba(var(--surface-rgb), 1); color: var(--primary); }
  .current-period { font-weight: 600; color: rgba(var(--text-primary-rgb), 1); position: relative; }
  .year-selector { display: flex; align-items: center; gap: var(--space-2); background: none; border: none; color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); font-weight: 600; cursor: pointer; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); }
  .year-selector:active { background: rgba(var(--surface-rgb), 0.5); }
  .year-dropdown { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: var(--space-2); z-index: 10; margin-top: var(--space-2); min-width: 100px; }
  .year-option { display: block; width: 100%; text-align: center; padding: var(--space-2); border: none; background: none; border-radius: var(--radius-sm); cursor: pointer; color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); }
  .year-option:active { background: rgba(var(--surface-rgb), 0.5); }
  .year-option.selected { background: rgba(var(--primary-rgb), 0.1); color: var(--primary); font-weight: 600; }

  .menu-group { display: flex; flex-direction: column; gap: var(--space-1); margin-top: var(--space-2); }
  .menu-title { font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-tertiary-rgb), 1); text-transform: uppercase; letter-spacing: 0.06em; padding: 0 var(--space-1) var(--space-1); }
  .menu-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); cursor: pointer; border: none; width: 100%; text-align: left; border: 1px solid rgba(var(--border-rgb), 0.3); }
  .menu-item:active { border-color: rgba(var(--primary-rgb), 0.6); }
  .menu-icon { width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(var(--surface-rgb), 0.5); color: rgba(var(--text-secondary-rgb), 1); }
  .menu-text { flex: 1; min-width: 0; }
  .menu-label { display: block; font-weight: 600; font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); margin-bottom: 2px; }
  .menu-desc { display: block; font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }

  .dest-section { display: flex; flex-direction: column; background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); border: 1px solid rgba(var(--border-rgb), 0.3); overflow: hidden; }
  .dest-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border: none; background: none; cursor: pointer; width: 100%; color: rgba(var(--text-primary-rgb), 1); }
  .dest-header-left { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); font-weight: 600; }
  .dest-header-right { display: flex; align-items: center; gap: var(--space-2); }
  .dest-mode { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }
  .dest-body { padding: 0 var(--space-4) var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); border-top: 1px solid rgba(var(--border-rgb), 0.2); padding-top: var(--space-3); }
  .dest-desc { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; }
  .dest-option { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; }
  .dest-option.active { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
  .dest-option input { margin-top: 3px; accent-color: var(--primary); }
  .dest-option-icon { width: 36px; height: 36px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .dest-option-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
  .dest-option-text strong { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .dest-option-text span { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }
  .dest-actions { margin-top: var(--space-1); }
  .bank-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .bank-item { display: flex; flex-direction: column; gap: 1px; padding: var(--space-2) var(--space-3); background: rgba(var(--surface-rgb), 0.5); border-radius: var(--radius-md); }
  .bank-name { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .bank-detail { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }
  .no-bank { text-align: center; padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); align-items: center; }
  .no-bank-text { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); margin: 0; }
  .cta-btn.small { padding: var(--space-3); font-size: var(--text-sm); width: auto; display: inline-block; }
  .dashed-btn { padding: var(--space-3) var(--space-4); font-size: var(--text-sm); width: auto; display: inline-block; background: transparent; border: 2px dashed rgba(var(--warning-rgb), 0.7); color: rgba(var(--warning-rgb), 1); border-radius: var(--radius-lg); cursor: pointer; font-weight: 600; }
  .dashed-btn:active { opacity: 0.7; }
  .freq-section { display: flex; flex-direction: column; gap: var(--space-2); }
  .freq-label { font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-secondary-rgb), 1); margin: 0; }
  .freq-options { display: flex; gap: var(--space-2); }
  .freq-btn { flex: 1; padding: var(--space-2); border: 1px solid rgba(var(--border-rgb), 0.5); border-radius: var(--radius-md); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-xs); font-weight: 500; cursor: pointer; text-align: center; }
  .freq-btn.active { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.05); color: var(--primary); font-weight: 600; }
  .bank-selector { display: flex; flex-direction: column; gap: var(--space-2); }
  .bank-selector-label { font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-secondary-rgb), 1); margin: 0; }
  .bank-selector-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-1); }
  .bank-option { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-2) var(--space-1); border: 1px solid rgba(var(--border-rgb), 0.3); border-radius: var(--radius-lg); background: rgba(var(--surface-rgb), 0.5); cursor: pointer; text-align: center; }
  .bank-option.active { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.08); }
  .bank-option-code { font-size: var(--text-xs); font-weight: 700; color: var(--primary); }
  .bank-option-name { font-size: var(--text-2xs); color: rgba(var(--text-tertiary-rgb), 1); line-height: 1.2; }
  .modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: var(--space-4); }
  .modal { background: rgba(var(--bg-rgb), 1); border-radius: var(--radius-xl); width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5); box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
  .modal-header { display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-size: var(--text-base); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  .modal-close { background: none; border: none; font-size: 1.25rem; color: rgba(var(--text-tertiary-rgb), 1); cursor: pointer; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); }
  .modal-close:active { background: rgba(var(--surface-rgb), 1); }
  .modal-body { display: flex; flex-direction: column; gap: var(--space-3); }
  .modal-body .text-input { padding: var(--space-3); font-size: var(--text-sm); border: 1px solid rgba(var(--border-rgb), 0.3); border-radius: var(--radius-lg); background: rgba(var(--surface-rgb), 0.5); color: rgba(var(--text-primary-rgb), 1); width: 100%; box-sizing: border-box; }
  .modal-body .text-input:focus { outline: none; border-color: var(--primary); }
  .modal-footer { display: flex; gap: var(--space-2); justify-content: flex-end; }
  .modal-footer .link-btn { font-size: var(--text-sm); font-weight: 600; }
</style>
