<script lang="ts">
  import api from '$lib/api';
  import Section from '$lib/components/Section.svelte';
  import { Plus, Trash2, Users } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import GhostButton from '$lib/components/ui/GhostButton.svelte';
  import AmountField from '$lib/components/ui/AmountField.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';

  let total = 0;
  let friends = [{ walletId: '', pctStr: '' }];
  let result: { walletId: string; amount: number; percentage: number }[] | null = null;
  let loading = false;
  let error = '';

  function addFriend() { friends = [...friends, { walletId: '', pctStr: '' }]; }
  function removeFriend(i: number) { friends = friends.filter((_, idx) => idx !== i); }

  function distribute() {
    const totalPct = friends.reduce((s, f) => s + parseFloat(f.pctStr || '0'), 0);
    if (Math.abs(totalPct - 100) > 0.01) { error = 'Los porcentajes deben sumar 100%'; return; }
    if (total <= 0) { error = 'Ingrese un monto total'; return; }
    error = '';
    let remaining = total;
    result = friends.map((f, i) => {
      const pct = parseFloat(f.pctStr || '0');
      const isLast = i === friends.length - 1;
      const amount = isLast ? remaining : Math.round(total * pct / 100 * 100) / 100;
      remaining -= amount;
      return { walletId: f.walletId, amount, percentage: pct };
    });
  }
</script>

<PageLayout title="Dividir pago">

  <Section>
    <AmountField label="Monto total (Bs)" bind:value={total} />
  </Section>

  <span class="participants-label">Participantes</span>

  <div class="participants">
    {#each friends as friend, i}
      <div class="participant-row">
        <div class="participant-field">
          <TextField label="ID Billetera" bind:value={friend.walletId} placeholder="Wallet ID" />
        </div>
        <div class="participant-pct">
          <TextField label="%" type="number" bind:value={friend.pctStr} placeholder="%" />
        </div>
        {#if friends.length > 1}
          <button class="remove-btn" onclick={() => removeFriend(i)} aria-label="Eliminar">
            <Trash2 size={16} />
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="split-actions">
    <GhostButton onClick={addFriend}><Plus size={16} /> Agregar</GhostButton>
    <PillButton label="Calcular división" onClick={distribute} />
  </div>

  {#if error}
    <div class="msg error">{error}</div>
  {/if}

  {#if result}
    <Section label="División">
      {#each result as r}
        <div class="result-row">
          <span>{r.walletId.slice(0, 12)}...</span>
          <span class="pct">{r.percentage}%</span>
          <span class="amount">Bs. {r.amount.toFixed(2)}</span>
        </div>
      {/each}
      <div class="result-total">
        <span>Total</span>
        <span>Bs. {result.reduce((s, r) => s + r.amount, 0).toFixed(2)}</span>
      </div>
    </Section>
  {/if}

</PageLayout>

<style>
  .participants-label { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .participants { display: flex; flex-direction: column; gap: var(--space-4); }
  .participant-row { display: flex; gap: var(--space-3); align-items: flex-end; }
  .participant-field { flex: 2; }
  .participant-pct { flex: 1; min-width: 80px; }
  .remove-btn { background: none; border: none; color: rgba(var(--error-rgb), 1); cursor: pointer; padding: var(--space-2); margin-bottom: 0.25rem; flex-shrink: 0; }
  .split-actions { display: flex; gap: var(--space-2); justify-content: space-between; }
  .msg { padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); }
  .result-row { display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid rgba(var(--border-rgb), 0.3); font-size: var(--text-sm); }
  .result-row .pct { color: rgba(var(--text-secondary-rgb), 1); }
  .result-row .amount { font-weight: 600; color: var(--primary); }
  .result-total { display: flex; justify-content: space-between; padding-top: var(--space-3); border-top: 1px solid rgba(var(--border-rgb), 0.3); font-weight: 700; font-size: var(--text-base); }
  .result-total span:last-child { color: var(--primary); }
</style>
