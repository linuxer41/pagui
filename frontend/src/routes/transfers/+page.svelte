<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { ArrowRightLeft, History, Send, Split, Users } from '@lucide/svelte';
</script>

<div class="page-header">
  <span class="page-header-title">Transferencias</span>
</div>
<div class="page-content" style="display:flex;flex-direction:column;gap:var(--space-4);padding-top:var(--space-4)">
  <button style="display:flex;flex-direction:column;gap:var(--space-4);padding:1.25rem;border-radius:var(--radius-xl);background:var(--surface);border:1px solid var(--border);cursor:pointer;transition:all var(--duration-fast) var(--ease-out);text-align:left;width:100%" onclick={() => goto('/transfers/p2p')}>
    <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;background:var(--primary-subtle);color:var(--primary-color)"><Send size={24} /></div>
    <div>
      <div style="font-weight:600;font-size:0.95rem;color:var(--text-primary)">Transferir ahora</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:2px">Envía dinero a otra billetera al instante</div>
    </div>
  </button>
  <button style="display:flex;flex-direction:column;gap:var(--space-4);padding:1.25rem;border-radius:var(--radius-xl);background:var(--surface);border:1px solid var(--border);cursor:pointer;transition:all var(--duration-fast) var(--ease-out);text-align:left;width:100%" onclick={() => goto('/split')}>
    <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;background:var(--warning-bg);color:var(--warning-color)"><Split size={24} /></div>
    <div>
      <div style="font-weight:600;font-size:0.95rem;color:var(--text-primary)">Pago compartido</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:2px">Divide el pago entre varias personas</div>
    </div>
  </button>
  <button style="display:flex;flex-direction:column;gap:var(--space-4);padding:1.25rem;border-radius:var(--radius-xl);background:var(--surface);border:1px solid var(--border);cursor:pointer;transition:all var(--duration-fast) var(--ease-out);text-align:left;width:100%" onclick={() => goto('/subscriptions')}>
    <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;background:var(--success-bg);color:var(--success-color)"><ArrowRightLeft size={24} /></div>
    <div>
      <div style="font-weight:600;font-size:0.95rem;color:var(--text-primary)">Suscripciones</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:2px">Pagos recurrentes automáticos</div>
    </div>
  </button>
  <button style="display:flex;flex-direction:column;gap:var(--space-4);padding:1.25rem;border-radius:var(--radius-xl);background:var(--surface);border:1px solid var(--border);cursor:pointer;transition:all var(--duration-fast) var(--ease-out);text-align:left;width:100%" onclick={() => goto('/transactions')}>
    <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;background:var(--primary-subtle);color:var(--primary-color)"><History size={24} /></div>
    <div>
      <div style="font-weight:600;font-size:0.95rem;color:var(--text-primary)">Historial</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:2px">Movimientos y transacciones</div>
    </div>
  </button>
</div>
