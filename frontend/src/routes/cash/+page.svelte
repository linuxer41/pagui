<script lang="ts">
  import { goto } from '$app/navigation';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { DollarSign, MapPin, UserPlus } from '@lucide/svelte';

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
      if (res.success) result = mode === 'in' ? '💰 Cash-in exitoso' : '💵 Cash-out exitoso';
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

<RouteLayout title="Cash">
  <div class="tabs">
    {#each ['in', 'out', 'register', 'nearby'] as m}
      <button class="tab" class:active={mode === m} on:click={() => { mode = m; result = ''; error = ''; }}>
        {m === 'in' ? '💰 Cash-in' : m === 'out' ? '💵 Cash-out' : m === 'register' ? '📋 Agente' : '📍 Cercanos'}
      </button>
    {/each}
  </div>

  {#if mode === 'in' || mode === 'out'}
    <div class="form">
      <Input id="agent" label="ID Agente" bind:value={agentId} placeholder="ID del agente" />
      <Input id="w" label="Tu billetera" bind:value={walletId} placeholder="Wallet ID" />
      <Input id="a" label="Monto (Bs)" type="number" bind:value={amount} placeholder="0.00" />
      <Input id="r" label="Referencia" bind:value={reference} placeholder="Opcional" />
      {#if error}<div class="msg error">{error}</div>{/if}
      {#if result}<div class="msg success">{result}</div>{/if}
      <Button on:click={handleTransaction} loading={loading} fullWidth>
        {mode === 'in' ? 'Depositar efectivo' : 'Retirar efectivo'}
      </Button>
    </div>
  {:else if mode === 'register'}
    <div class="form">
      <Input id="an" label="Nombre del agente" bind:value={agentName} placeholder="Nombre" />
      <Input id="ap" label="Teléfono" bind:value={agentPhone} placeholder="+591" />
      <Input id="aa" label="Dirección" bind:value={agentAddress} placeholder="Dirección" />
      <Input id="alat" label="Latitud" type="number" bind:value={agentLat} />
      <Input id="alng" label="Longitud" type="number" bind:value={agentLng} />
      {#if error}<div class="msg error">{error}</div>{/if}
      {#if result}<div class="msg success">{result}</div>{/if}
      <Button on:click={handleRegisterAgent} loading={loading} fullWidth>Registrar agente</Button>
    </div>
  {:else}
    <div class="form">
      <Input id="lat" label="Tu latitud" type="number" bind:value={agentLat} />
      <Input id="lng" label="Tu longitud" type="number" bind:value={agentLng} />
      <Button on:click={handleNearby} loading={loading} fullWidth>Buscar agentes cerca</Button>
      {#each agents as a}
        <div class="agent-card">
          <strong>{a.name}</strong>
          <p>{a.address} • {a.distance_km ? `${Number(a.distance_km).toFixed(1)} km` : ''}</p>
        </div>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .tabs { display: flex; gap: 0.25rem; background: var(--surface); border-radius: 10px; padding: 0.25rem; margin-bottom: 1rem; border: 1px solid var(--border); }
  .tab { flex: 1; padding: 0.5rem; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 0.8rem; color: var(--text-secondary); transition: all 0.2s; }
  .tab.active { background: var(--primary); color: white; font-weight: 600; }
  .form { display: flex; flex-direction: column; gap: 1rem; }
  .msg { padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; }
  .msg.error { background: #ffebee; color: #c62828; }
  .msg.success { background: #e8f5e9; color: #2e7d32; }
  .agent-card { background: var(--surface); border-radius: 10px; padding: 0.75rem; border: 1px solid var(--border); }
  .agent-card p { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--text-secondary); }
</style>
