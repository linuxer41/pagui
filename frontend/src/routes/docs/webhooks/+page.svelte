<script lang="ts">
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { Webhook, Bell, Shield, Code } from '@lucide/svelte';
</script>

<PageLayout title="Documentación: Webhooks">
  <div class="doc">
    <section>
      <h2><Webhook size={18} /> ¿Qué son los Webhooks?</h2>
      <p>Los webhooks son notificaciones automáticas que Pagui envía a tu servidor cuando ocurren eventos en tu billetera de recaudación. Funcionan como callbacks HTTP que se disparan en tiempo real.</p>
    </section>

    <section>
      <h2><Bell size={18} /> Eventos disponibles</h2>
      <ul>
        <li><code>transfer.created</code> — Se creó una transferencia</li>
        <li><code>transfer.completed</code> — Transferencia completada exitosamente</li>
        <li><code>transfer.failed</code> — Transferencia fallida</li>
        <li><code>wallet.topup</code> — Recarga de saldo en la billetera</li>
        <li><code>fraud.alert</code> — Alerta de actividad sospechosa</li>
      </ul>
    </section>

    <section>
      <h2><Code size={18} /> Formato del payload</h2>
      <p>Cada webhook envía una petición POST con el siguiente formato:</p>
      <pre>{@html `{
  "event": "transfer.completed",
  "data": {
    "id": "123456789",
    "amount": 100.00,
    "currency": "BOB",
    "status": "completed",
    "timestamp": "2026-07-17T20:00:00Z"
  },
  "signature": "sha256=..."
}`}</pre>
    </section>

    <section>
      <h2><Shield size={18} /> Verificación de firma</h2>
      <p>Los webhooks se firman automáticamente usando HMAC-SHA256 con tu API Key activa como secreto. Para verificar que un webhook proviene de Pagui, valida la firma <code>signature</code> del payload usando tu API Key:</p>
      <pre>{@html `const crypto = require('crypto');
const sig = crypto
  .createHmac('sha256', apiKey)
  .update(JSON.stringify(payload.data))
  .digest('hex');
// Comparar con payload.signature`}</pre>
    </section>
  </div>
</PageLayout>

<style>
  .doc { display: flex; flex-direction: column; gap: var(--space-6); }
  section { display: flex; flex-direction: column; gap: var(--space-2); }
  h2 { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-base); font-weight: 700; color: rgba(var(--text-primary-rgb), 1); margin: 0; }
  p, li { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); line-height: 1.6; margin: 0; }
  ul { display: flex; flex-direction: column; gap: var(--space-2); padding-left: var(--space-5); margin: 0; }
  pre { background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.3); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); font-family: var(--font-mono); font-size: var(--text-xs); overflow-x: auto; color: rgba(var(--text-primary-rgb), 1); }
  code { font-family: var(--font-mono); font-size: var(--text-xs); background: rgba(var(--surface-rgb), 0.5); padding: 1px 4px; border-radius: var(--radius-sm); color: var(--primary); }
</style>
