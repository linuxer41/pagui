<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
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

<div class="page-header">
  <span class="page-header-title">Pago compartido</span>
</div>
<div class="page-content" style="padding-top:var(--space-4)">
  <div class="section-card" style="margin-top:0">
    <Input id="total" label="Monto total (Bs)" type="number" bind:value={total} placeholder="0.00" />
  </div>

  <div style="font-size:0.9rem;font-weight:600;margin:1.25rem 0 var(--space-4);color:var(--text-primary)">Participantes</div>
  <div style="display:flex;flex-direction:column;gap:var(--space-4)">
    {#each friends as friend, i}
      <div style="display:flex;gap:0.5rem;align-items:flex-end">
        <div style="flex:2">
          <Input id={`w-${i}`} label="ID Billetera" bind:value={friend.walletId} placeholder="Wallet ID" />
        </div>
        <div style="flex:1;width:80px">
          <Input id={`p-${i}`} label="%" type="number" bind:value={friend.percentage} placeholder="%" />
        </div>
        {#if friends.length > 1}
          <button style="background:none;border:none;color:var(--error-color);cursor:pointer;padding:0.5rem;margin-bottom:0.25rem;flex-shrink:0" onclick={() => removeFriend(i)} aria-label="Eliminar">
            <Trash2 size={16} />
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="form-actions" style="display:flex;gap:0.5rem;justify-content:space-between;margin-top:1.25rem">
    <Button variant="ghost" onclick={addFriend}><Plus size={16} /> Agregar</Button>
    <Button onclick={distribute}>Calcular división</Button>
  </div>

  {#if error}
    <div style="padding:0.75rem;background:var(--error-bg);color:var(--error-color);border-radius:var(--radius-lg);margin-top:0.75rem;font-size:0.85rem">{error}</div>
  {/if}

  {#if result}
    <div class="section-card" style="margin-top:1.25rem">
      <div style="font-weight:600;font-size:0.95rem;margin-bottom:0.75rem">División</div>
      {#each result as r}
        <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border)">
          <span style="font-size:var(--text-sm);color:var(--text-secondary)">{r.walletId.slice(0, 12)}...</span>
          <span style="font-size:var(--text-sm);font-weight:600">{r.percentage}%</span>
          <span style="font-weight:600;color:var(--primary-color)">Bs. {r.amount.toFixed(2)}</span>
        </div>
      {/each}
      <div style="display:flex;justify-content:space-between;padding-top:0.75rem;font-weight:700;font-size:1.05rem;border-top:1px solid var(--border);margin-top:0.25rem">
        <span>Total</span>
        <span style="color:var(--primary-color)">Bs. {result.reduce((s, r) => s + r.amount, 0).toFixed(2)}</span>
      </div>
    </div>
  {/if}
</div>
