<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import api from '$lib/api';
  import { ArrowLeft, ArrowLeftRight } from '@lucide/svelte';

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

<div class="page-header">
  <button class="page-header-back" onclick={() => history.back()}>
    <ArrowLeft size={20} />
  </button>
  <h1 class="page-header-title">Tasas de cambio</h1>
</div>

<div class="page-content">
  {#if loading}
    <p style="text-align:center;padding:var(--space-8);color:var(--text-secondary);font-size:var(--text-sm)">Cargando...</p>
  {:else}
    <div class="section-card" style="margin-bottom:var(--space-4)">
      <div class="section-card-title">Convertidor</div>
      <div class="form-group">
        <Input id="amt" label="Monto" type="number" bind:value={convertAmount} />
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <select bind:value={convertFrom} style="flex:1;padding:var(--space-2) var(--space-3);border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:var(--text-sm);height:44px">
            {#each currencies as c}<option value={c}>{c}</option>{/each}
          </select>
          <ArrowLeftRight size={20} style="color:var(--text-tertiary);flex-shrink:0" />
          <select bind:value={convertTo} style="flex:1;padding:var(--space-2) var(--space-3);border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:var(--text-sm);height:44px">
            {#each currencies as c}<option value={c}>{c}</option>{/each}
          </select>
        </div>
        <Button onclick={handleConvert} loading={converting} fullWidth>Convertir</Button>
        {#if convertResult}
          <div style="padding:var(--space-3);background:var(--primary-subtle);border-radius:var(--radius-lg);font-size:var(--text-sm);text-align:center">
            Bs. {convertAmount} {convertFrom} = <strong>Bs. {convertResult.amount.toFixed(2)} {convertTo}</strong>
            <p style="font-size:var(--text-xs);color:var(--text-secondary);margin:var(--space-1) 0 0">Tasa: {convertResult.rate}</p>
          </div>
        {/if}
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-title">Tasas disponibles</div>
      {#each rates as r}
        <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border)">
          <span style="font-size:var(--text-sm)">{r.base_currency} → {r.target_currency}</span>
          <span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-color);font-size:var(--text-sm)">{Number(r.rate).toFixed(6)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
