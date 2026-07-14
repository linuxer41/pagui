<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import api from '$lib/api';
  import { ArrowLeftRight, RefreshCw } from '@lucide/svelte';

  let rates: any[] = []; let currencies: string[] = [];
  let loading = true;
  let convertFrom = 'USD'; let convertTo = 'BOB';
  let convertAmount = 100; let convertResult: any = null;
  let converting = false;

  onMount(async () => {
    try {
      const res = await api.getFXRates();
      if (res.success) { rates = res.data.rates || []; currencies = res.data.currencies || []; }
    } catch {}
    finally { loading = false; }
  });

  async function handleConvert() {
    converting = true; convertResult = null;
    try {
      const res = await api.convertCurrency({ amount: convertAmount, from: convertFrom, to: convertTo });
      if (res.success) convertResult = res.data;
    } catch {}
    finally { converting = false; }
  }
</script>

<RouteLayout title="Tasas de cambio">
  {#if loading}
    <p class="loading">Cargando...</p>
  {:else}
    <div class="converter">
      <h3>Convertidor</h3>
      <div class="row">
        <Input id="amt" label="Monto" type="number" bind:value={convertAmount} />
      </div>
      <div class="row pair">
        <select bind:value={convertFrom}>
          {#each currencies as c}<option value={c}>{c}</option>{/each}
        </select>
        <ArrowLeftRight size={20} />
        <select bind:value={convertTo}>
          {#each currencies as c}<option value={c}>{c}</option>{/each}
        </select>
      </div>
      <Button on:click={handleConvert} loading={converting} fullWidth>Convertir</Button>
      {#if convertResult}
        <div class="result">
          Bs. {convertAmount} {convertFrom} = <strong>Bs. {convertResult.amount.toFixed(2)} {convertTo}</strong>
          <p>Tasa: {convertResult.rate}</p>
        </div>
      {/if}
    </div>

    <div class="rates-list">
      <h3>Tasas disponibles</h3>
      {#each rates as r}
        <div class="rate-row">
          <span class="pair">{r.base_currency} → {r.target_currency}</span>
          <span class="rate">{Number(r.rate).toFixed(6)}</span>
        </div>
      {/each}
    </div>
  {/if}
</RouteLayout>

<style>
  .loading { text-align: center; padding: 2rem; color: var(--text-secondary); }
  .converter, .rates-list { background: var(--surface); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border); }
  .converter h3, .rates-list h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .row { margin-bottom: 0.75rem; }
  .pair { display: flex; align-items: center; gap: 0.5rem; }
  .pair select { flex: 1; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border); background: var(--background); color: var(--text-primary); }
  .result { margin-top: 0.75rem; padding: 0.75rem; background: #e3f2fd; border-radius: 8px; font-size: 1rem; text-align: center; }
  .result p { font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0; }
  .rate-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
  .rate-row:last-child { border: none; }
  .pair { font-size: 0.9rem; }
  .rate { font-family: monospace; font-weight: 600; color: var(--primary); }
</style>
