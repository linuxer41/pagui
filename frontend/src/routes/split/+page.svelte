<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import api from '$lib/api';
  import { Plus, Trash2, Users } from '@lucide/svelte';

  let total = 0;
  let friends = [{ walletId: '', percentage: 0 }];
  let result: { walletId: string; amount: number; percentage: number }[] | null = null;
  let loading = false;
  let error = '';

  function addFriend() { friends = [...friends, { walletId: '', percentage: 0 }]; }
  function removeFriend(i: number) { friends = friends.filter((_, idx) => idx !== i); }

  function distribute() {
    const totalPct = friends.reduce((s, f) => s + Number(f.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) { error = 'Los porcentajes deben sumar 100%'; return; }
    if (total <= 0) { error = 'Ingrese un monto total'; return; }
    error = '';
    let remaining = total;
    result = friends.map((f, i) => {
      const isLast = i === friends.length - 1;
      const amount = isLast ? remaining : Math.round(total * Number(f.percentage) / 100 * 100) / 100;
      remaining -= amount;
      return { walletId: f.walletId, amount, percentage: Number(f.percentage) };
    });
  }
</script>

<RouteLayout title="Pago compartido">
  <div class="card">
    <Input id="total" label="Monto total (Bs)" type="number" bind:value={total} placeholder="0.00" />
  </div>

  <h3 class="section-title">Participantes</h3>
  <div class="friends">
    {#each friends as friend, i}
      <div class="friend-row">
        <Input id={`w-${i}`} label="ID Billetera" bind:value={friend.walletId} placeholder="Wallet ID" />
        <Input id={`p-${i}`} label="%" type="number" bind:value={friend.percentage} placeholder="%" />
        {#if friends.length > 1}
          <button class="remove-btn" on:click={() => removeFriend(i)} aria-label="Eliminar">
            <Trash2 size={16} />
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="actions">
    <Button variant="ghost" on:click={addFriend}><Plus size={16} /> Agregar</Button>
    <Button on:click={distribute}>Calcular división</Button>
  </div>

  {#if error}<div class="msg error">{error}</div>{/if}

  {#if result}
    <div class="result">
      <h3>División</h3>
      {#each result as r}
        <div class="result-row">
          <span class="wallet">{r.walletId.slice(0, 12)}...</span>
          <span class="pct">{r.percentage}%</span>
          <span class="amt">Bs. {r.amount.toFixed(2)}</span>
        </div>
      {/each}
      <div class="result-total">
        <span>Total</span>
        <span>Bs. {result.reduce((s, r) => s + r.amount, 0).toFixed(2)}</span>
      </div>
    </div>
  {/if}
</RouteLayout>

<style>
  .card { background: var(--surface); border-radius: 12px; padding: 1rem; border: 1px solid var(--border); }
  .section-title { font-size: 0.9rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  .friends { display: flex; flex-direction: column; gap: 0.5rem; }
  .friend-row { display: flex; gap: 0.5rem; align-items: flex-end; }
  .friend-row > :first-child { flex: 2; }
  .friend-row > :nth-child(2) { flex: 1; width: 80px; }
  .remove-btn { background: none; border: none; color: #ef5350; cursor: pointer; padding: 0.5rem; margin-bottom: 0.25rem; }
  .actions { display: flex; gap: 0.5rem; justify-content: space-between; margin-top: 1rem; }
  .msg { padding: 0.5rem; background: #ffebee; color: #c62828; border-radius: 8px; margin-top: 0.5rem; font-size: 0.85rem; }
  .result { background: var(--surface); border-radius: 12px; padding: 1rem; margin-top: 1rem; border: 1px solid var(--border); }
  .result h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .result-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
  .result-row:last-child { border: none; }
  .wallet { font-size: 0.85rem; color: var(--text-secondary); }
  .pct { font-size: 0.85rem; font-weight: 600; }
  .amt { font-weight: 600; color: var(--primary); }
  .result-total { display: flex; justify-content: space-between; padding-top: 0.75rem; font-weight: 700; font-size: 1.05rem; }
</style>
