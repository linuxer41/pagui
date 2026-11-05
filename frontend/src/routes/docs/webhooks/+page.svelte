<script lang="ts">
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { Webhook, Bell, Shield, Code } from '@lucide/svelte';
</script>

<PageLayout title="Documentación: Webhooks">
  <div class="doc">
    <section>
      <h2><Webhook size={18} /> ¿Qué son los Webhooks?</h2>
      <p>Los webhooks son notificaciones automáticas que Pagui envía a tu servidor cuando ocurren eventos en tu billetera de recaudación. Funcionan como callbacks HTTP que se disparan en tiempo real.</p>
      <p>Puedes suscribirte desde <a href="/webhooks">Webhooks</a> en el panel o con tu API Key contra la API pública: <code>POST /webhooks</code> con <code>{ "url": "...", "events": ["qr.paid"] }</code> y el header <code>X-API-Key</code> (requiere permiso <code>qr_generate</code>). La billetera la determina la clave; <code>GET /webhooks</code> lista y <code>DELETE /webhooks/:id</code> da de baja.</p>
    </section>

    <section>
      <h2><Bell size={18} /> Eventos disponibles</h2>
      <ul>
        <li><code>qr.paid</code> — Alguien pagó un QR de tu billetera (llega tanto si el banco avisa como si Pagui lo detecta al sondear)</li>
        <li><code>transfer.created</code> — Se creó una transferencia</li>
        <li><code>transfer.completed</code> — Transferencia completada exitosamente</li>
        <li><code>transfer.failed</code> — Transferencia fallida</li>
        <li><code>wallet.topup</code> — Recarga de saldo en la billetera</li>
        <li><code>fraud.alert</code> — Alerta de actividad sospechosa</li>
      </ul>
    </section>

    <section>
      <h2><Code size={18} /> Formato del payload</h2>
      <p>Pagui hace <code>POST</code> a tu URL con el evento como cuerpo plano y dos headers: <code>X-Webhook-Event</code> con el nombre del evento y <code>X-Webhook-Signature</code> con la firma. Ejemplo de <code>qr.paid</code>:</p>
      <pre>{@html `POST https://tudominio.com/webhooks/pago
X-Webhook-Event: qr.paid
X-Webhook-Signature: 5f4c...e1
Content-Type: application/json

{
  "qrId": "QR-2026-11-04-0001",
  "transactionId": "txn-del-comercio",
  "bankTransactionId": "1234567",
  "walletId": "741852369",
  "amount": 100,
  "currency": "BOB",
  "paymentDate": "2026-11-04T18:22:00Z",
  "paymentHour": "18:22",
  "senderName": "Juan Perez",
  "senderDocumentId": "1234567",
  "senderAccount": "100000001",
  "senderBankCode": "701",
  "status": "paid"
}`}</pre>
      <p><code>transactionId</code> es la referencia que el comercio mandó al crear el QR: úsala para casar el pago con su factura. Reintentos: 3, con backoff 20s / 40s / 80s; si tu endpoint responde 2xx se da por entregado.</p>
    </section>

    <section>
      <h2><Shield size={18} /> Verificación de firma</h2>
      <p>La firma es HMAC-SHA256 de la <strong>API Key activa de tu billetera</strong> sobre el cuerpo crudo tal como llegó (no sobre un objeto re-serializado). Compara en tiempo constante:</p>
      <pre>{@html `const crypto = require('crypto');

app.post('/webhooks/pago', express.raw({ type: 'application/json' }), (req, res) => {
  const esperado = crypto
    .createHmac('sha256', apiKey)
    .update(req.body)          // Buffer crudo, no JSON.stringify(req.body)
    .digest('hex');
  const firmado = req.get('X-Webhook-Signature') || '';
  const igual = esperado.length === firmado.length &&
    crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(firmado));
  if (!igual) return res.status(401).send('firma invalida');
  const data = JSON.parse(req.body.toString());
  // ... asentar el pago de data.transactionId
  res.sendStatus(200);
})`}</pre>
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
