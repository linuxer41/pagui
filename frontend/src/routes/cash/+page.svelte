<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { ArrowLeft } from '@lucide/svelte';

  let mode: 'in' | 'out' | 'register' | 'nearby' = 'in';
  let agentId = ''; let walletId = ''; let amount = 0; let reference = '';
  let agentName = ''; let agentPhone = ''; let agentAddress = '';
  let agentLat = -16.5; let agentLng = -68.15;
  let loading = false; let error = ''; let result = '';
  let agents: any[] = [];

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
      if (res.success) agents = res.data || [];
    } catch (e: any) { error = e.message; }
    finally { loading = false; }
  }
</script>

<div class="page-header">
  <button class="page-header-back" onclick={() => history.back()}>
    <ArrowLeft size={20} />
  </button>
  <h1 class="page-header-title">Cash</h1>
</div>

<div class="page-content">
  <div style="display:flex;gap:var(--space-1);background:var(--surface);border-radius:var(--radius-xl);padding:var(--space-1);border:1px solid var(--border);margin-bottom:var(--space-4)">
    {#each ['in', 'out', 'register', 'nearby'] as m}
      <button
        style="flex:1;padding:var(--space-2) var(--space-1);border:none;background:{mode === m ? 'var(--primary-color)' : 'transparent'};border-radius:var(--radius-lg);cursor:pointer;font-size:var(--text-sm);color:{mode === m ? 'white' : 'var(--text-secondary)'};font-weight:{mode === m ? 600 : 400};transition:all var(--duration-fast) var(--ease-out)"
        onclick={() => { mode = m; result = ''; error = ''; }}
      >
        {m === 'in' ? 'Cash-in' : m === 'out' ? 'Cash-out' : m === 'register' ? 'Agente' : 'Cercanos'}
      </button>
    {/each}
  </div>

  {#if mode === 'in' || mode === 'out'}
    <div class="section-card">
      <div class="form-group">
        <Input id="agent" label="ID Agente" bind:value={agentId} placeholder="ID del agente" />
        <Input id="w" label="Tu billetera" bind:value={walletId} placeholder="Wallet ID" />
        <Input id="a" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
        <Input id="r" label="Referencia" bind:value={reference} placeholder="Opcional" />
        {#if error}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--error-bg);color:var(--error-color)">{error}</div>{/if}
        {#if result}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--success-bg);color:var(--success-color)">{result}</div>{/if}
        <Button onclick={handleTransaction} loading={loading} fullWidth>
          {mode === 'in' ? 'Depositar efectivo' : 'Retirar efectivo'}
        </Button>
      </div>
    </div>
  {:else if mode === 'register'}
    <div class="section-card">
      <div class="form-group">
        <Input id="an" label="Nombre del agente" bind:value={agentName} placeholder="Nombre" />
        <Input id="ap" label="Teléfono" bind:value={agentPhone} placeholder="+591" />
        <Input id="aa" label="Dirección" bind:value={agentAddress} placeholder="Dirección" />
        <Input id="alat" label="Latitud" type="number" bind:value={agentLat} />
        <Input id="alng" label="Longitud" type="number" bind:value={agentLng} />
        {#if error}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--error-bg);color:var(--error-color)">{error}</div>{/if}
        {#if result}<div style="padding:var(--space-3);border-radius:var(--radius-lg);font-size:var(--text-sm);background:var(--success-bg);color:var(--success-color)">{result}</div>{/if}
        <Button onclick={handleRegisterAgent} loading={loading} fullWidth>Registrar agente</Button>
      </div>
    </div>
  {:else}
    <div class="section-card">
      <div class="form-group">
        <Input id="lat" label="Tu latitud" type="number" bind:value={agentLat} />
        <Input id="lng" label="Tu longitud" type="number" bind:value={agentLng} />
        <Button onclick={handleNearby} loading={loading} fullWidth>Buscar agentes cerca</Button>
        {#each agents as a}
          <div style="background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-3);border:1px solid var(--border)">
            <strong style="font-size:var(--text-sm)">{a.name}</strong>
            <p style="margin:var(--space-1) 0 0;font-size:var(--text-sm);color:var(--text-secondary)">{a.address}{a.distance_km ? ' • ' + Number(a.distance_km).toFixed(1) + ' km' : ''}</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
