<script lang="ts">
  import api from '$lib/api';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { Banknote, MapPin, UserPlus } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import AmountField from '$lib/components/ui/AmountField.svelte';

  let mode: 'in' | 'out' | 'register' | 'nearby' = $state('in');
  let agentId = $state(''); let walletId = $state(''); let amount = $state(0); let reference = $state('');
  let agentName = $state(''); let agentPhone = $state(''); let agentAddress = $state('');
  let agentLatStr = $state('-16.5'); let agentLngStr = $state('-68.15');
  let loading = $state(false); let error = $state(''); let result = $state('');
  let agents: any[] = $state([]);
  let agentLat = $derived(parseFloat(agentLatStr) || -16.5)
  let agentLng = $derived(parseFloat(agentLngStr) || -68.15)

  async function handleTransaction() {
    if (!agentId || !walletId || amount <= 0) { error = 'Complete todos los campos'; return; }
    loading = true; error = '';
    try {
      const res = await api.cashTransaction({ agentId, userWalletId: walletId, amount, direction: mode === 'in' ? 'cash_in' : 'cash_out', reference: reference || `tx-${Date.now()}` });
      if (res.success) result = mode === 'in' ? 'Cash-in exitoso' : 'Cash-out exitoso';
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }

  async function handleRegisterAgent() {
    if (!agentName || !agentPhone || !agentAddress) { error = 'Complete todos los campos'; return; }
    loading = true;
    try {
      const res = await api.registerCashAgent({ name: agentName, phone: agentPhone, address: agentAddress, lat: agentLat, lng: agentLng });
      if (res.success) { result = 'Agente registrado'; mode = 'in'; }
      else error = res.message || 'Error';
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }

  async function handleNearby() {
    loading = true;
    try {
      const res = await api.getNearbyAgents(agentLat, agentLng);
      if (res.success) agents = res.data?.data || [];
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

<PageLayout title="Cash">

  <div class="tab-bar">
    {#each (['in', 'out', 'register', 'nearby'] as const) as m}
      <button class="tab" class:active={mode === m}
        onclick={() => { mode = m; result = ''; error = ''; }}>
        {m === 'in' ? 'Cash-in' : m === 'out' ? 'Cash-out' : m === 'register' ? 'Agente' : 'Cercanos'}
      </button>
    {/each}
  </div>

  {#if mode === 'in' || mode === 'out'}
    <div class="form">
      <TextField label="ID Agente" bind:value={agentId} placeholder="ID del agente" />
      <TextField label="Tu billetera" bind:value={walletId} placeholder="Wallet ID" />
      <AmountField label="Monto" bind:value={amount} />
      <TextField label="Referencia" bind:value={reference} placeholder="Opcional" />
      {#if error}<div class="msg error">{error}</div>{/if}
      {#if result}<div class="msg success">{result}</div>{/if}
      <PillButton label={mode === 'in' ? 'Depositar efectivo' : 'Retirar efectivo'} onClick={handleTransaction} {loading} fullWidth />
    </div>
  {:else if mode === 'register'}
    <div class="form">
      <TextField label="Nombre del agente" bind:value={agentName} placeholder="Nombre" />
      <TextField label="Teléfono" bind:value={agentPhone} placeholder="+591" />
      <TextField label="Dirección" bind:value={agentAddress} placeholder="Dirección" />
      <TextField label="Latitud" bind:value={agentLatStr} placeholder="-16.5" />
      <TextField label="Longitud" bind:value={agentLngStr} placeholder="-68.15" />
      {#if error}<div class="msg error">{error}</div>{/if}
      {#if result}<div class="msg success">{result}</div>{/if}
      <PillButton label="Registrar agente" onClick={handleRegisterAgent} {loading} fullWidth />
    </div>
  {:else}
    <div class="form">
      <TextField label="Tu latitud" bind:value={agentLatStr} placeholder="-16.5" />
      <TextField label="Tu longitud" bind:value={agentLngStr} placeholder="-68.15" />
      <PillButton label="Buscar agentes cerca" onClick={handleNearby} {loading} fullWidth />
      {#each agents as a}
        <div class="agent-card">
          <strong>{a.name}</strong>
          <p>{a.address}{a.distance_km ? ' • ' + Number(a.distance_km).toFixed(1) + ' km' : ''}</p>
        </div>
      {/each}
    </div>
  {/if}
</PageLayout>

<style>
  .tab-bar { display: flex; gap: var(--space-1); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); padding: var(--space-1); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .tab { flex: 1; padding: var(--space-2) var(--space-1); border: none; border-radius: var(--radius-lg); cursor: pointer; font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); font-weight: 400; }
  .tab.active { background: var(--primary); color: white; font-weight: 600; }
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; }
  .msg.error { background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .msg.success { background: rgba(var(--success-rgb), 0.1); color: rgba(var(--success-rgb), 1); }
  .agent-card { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); padding: var(--space-3); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .agent-card p { margin: var(--space-1) 0 0; font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); }
</style>
