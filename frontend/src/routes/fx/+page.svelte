<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/api';
  import { ArrowLeftRight } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import AmountField from '$lib/components/ui/AmountField.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Section from '$lib/components/Section.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let rates: any[] = []; let currencies: string[] = [];
  let loading = true;
  let convertFrom = 'USD'; let convertTo = 'BOB';
  let convertAmount = 100; let convertResult: any = null;
  let converting = false;

  onMount(async () => {
    try {
      const res = await api.getFXRates();
      if (res && res.success !== false) { rates = res.data?.rates || []; currencies = res.data?.currencies || []; }
    } catch {}
    finally { loading = false; }
  });

  async function handleConvert() {
    converting = true; convertResult = null;
    try {
      const res = await api.convertCurrency({ amount: convertAmount, from: convertFrom, to: convertTo });
      if (res && res.success !== false) convertResult = res.data ?? res;
    } catch {}
    finally { converting = false; }
  }
</script>

<PageLayout title="Tasas de cambio">

  {#if loading}
    <Skeleton width="100%" height="48px" radius="md" count={4} gap="space-2" />
  {:else}
    <Section label="Convertidor">
      <div class="form">
        <AmountField label="Monto" bind:value={convertAmount} />
        <div class="currency-pair">
          <select class="currency-select" bind:value={convertFrom}>
            {#each currencies as c}<option value={c}>{c}</option>{/each}
          </select>
          <ArrowLeftRight size={20} class="swap-icon" />
          <select class="currency-select" bind:value={convertTo}>
            {#each currencies as c}<option value={c}>{c}</option>{/each}
          </select>
        </div>
        <PillButton label="Convertir" onClick={handleConvert} loading={converting} fullWidth />
        {#if convertResult}
          <div class="result-card">
            {convertAmount} {convertFrom} = <strong>{convertResult.amount.toFixed(2)} {convertTo}</strong>
            <p>Tasa: {convertResult.rate}</p>
          </div>
        {/if}
      </div>
    </Section>

    <Section label="Tasas disponibles">
      {#each rates as r}
        <div class="rate-row">
          <span>{r.base_currency} → {r.target_currency}</span>
          <span class="rate-value">{Number(r.rate).toFixed(6)}</span>
        </div>
      {/each}
    </Section>
  {/if}
</PageLayout>

<style>
  .form { display: flex; flex-direction: column; gap: var(--space-4); }
  .currency-pair { display: flex; align-items: center; gap: var(--space-2); }
  .currency-select { flex: 1; padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.5); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); height: 44px; }
  .result-card { padding: var(--space-3); background: rgba(var(--primary-rgb), 0.1); border-radius: var(--radius-lg); font-size: var(--text-sm); text-align: center; color: rgba(var(--text-primary-rgb), 1); }
  .result-card p { font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); margin: var(--space-1) 0 0; }
  .rate-row { display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid rgba(var(--border-rgb), 0.3); font-size: var(--text-sm); }
  .rate-row:last-child { border-bottom: none; }
  .rate-value { font-family: var(--font-mono); font-weight: 600; color: var(--primary); font-size: var(--text-sm); }
</style>
