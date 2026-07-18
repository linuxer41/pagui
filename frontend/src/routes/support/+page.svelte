<script lang="ts">
  import { goto } from '$app/navigation';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import { MessageCircle, ChevronRight } from '@lucide/svelte';

  const faqs = [
    { question: '¿Cómo genero un código QR para cobros?', answer: 'Ve a la sección "Código QR" desde el menú principal, ingresa el monto y descripción, y haz clic en "Generar QR". El código se creará con un tiempo de expiración configurable.' },
    { question: '¿Puedo modificar el monto después de generar el QR?', answer: 'Sí, al generar el QR puedes activar la opción "Permitir modificar monto" para que los pagadores puedan ajustar el valor antes de realizar el pago.' },
    { question: '¿Cómo veo el estado de mis pagos QR?', answer: 'En la página principal verás estadísticas en tiempo real: pendientes, pagados y cancelados. También puedes ver el historial completo en "Transacciones".' },
    { question: '¿Qué son las API Keys y para qué sirven?', answer: 'Las API Keys te permiten integrar Pagui con tu sistema o aplicación externa. Puedes crearlas desde tu perfil y usarlas para automatizar operaciones.' },
    { question: '¿Cuánto tiempo dura un código QR?', answer: 'Por defecto, los códigos QR expiran en 15 minutos, pero puedes configurar una fecha de vencimiento personalizada al generarlos.' },
    { question: '¿Cómo cambio mi contraseña?', answer: 'Ve a tu perfil y selecciona "Cambiar contraseña". Ingresa tu contraseña actual y la nueva contraseña para actualizarla.' },
    { question: '¿Puedo ver el historial de mis transacciones?', answer: 'Sí, accede a "Transacciones" desde el menú para ver todo tu historial de pagos y cobros, con filtros por fecha y estado.' },
  ];
</script>

<PageLayout title="Soporte">
  <button class="chat-btn" onclick={() => goto('/support/chat')}>
    <div class="chat-icon"><MessageCircle size={24} /></div>
    <div class="chat-text">
      <span class="chat-label">Chat en línea</span>
      <span class="chat-desc">Habla con un agente de soporte</span>
    </div>
    <ChevronRight size={20} />
  </button>

  <section class="faq-section">
    <span class="section-label"><MessageCircle size={16} /> Preguntas frecuentes</span>
    {#each faqs as faq}
      <details class="faq-item">
        <summary>{faq.question}</summary>
        <p>{faq.answer}</p>
      </details>
    {/each}
  </section>
</PageLayout>

<style>
  .chat-btn { display: flex; align-items: center; gap: var(--space-4); width: 100%; padding: var(--space-5); background: rgba(var(--surface-rgb), 1); border: 1px solid rgba(var(--border-rgb), 0.5); border-radius: var(--radius-xl); cursor: pointer; text-align: left; margin-bottom: var(--space-6); }
  .chat-btn:active { border-color: rgba(var(--primary-rgb), 0.6); }
  .chat-icon { width: 52px; height: 52px; border-radius: var(--radius-lg); background: rgba(var(--primary-rgb), 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .chat-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .chat-label { font-weight: 700; font-size: var(--text-base); color: rgba(var(--text-primary-rgb), 1); }
  .chat-desc { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); }
  .faq-section { display: flex; flex-direction: column; gap: var(--space-2); }
  .section-label { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-tertiary-rgb), 1); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--space-1); }
  .faq-item { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; }
  .faq-item summary { font-weight: 500; color: rgba(var(--text-primary-rgb), 1); outline: none; font-size: var(--text-sm); }
  .faq-item p { margin: var(--space-2) 0 0; color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-sm); line-height: 1.5; }
</style>
