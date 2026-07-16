<script lang="ts">
  import { onMount } from 'svelte';
  import { MessageCircle, Send } from '@lucide/svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';

  const faqs = [
    { question: '¿Cómo genero un código QR para cobros?', answer: 'Ve a la sección "Código QR" desde el menú principal, ingresa el monto y descripción, y haz clic en "Generar QR". El código se creará con un tiempo de expiración configurable.' },
    { question: '¿Puedo modificar el monto después de generar el QR?', answer: 'Sí, al generar el QR puedes activar la opción "Permitir modificar monto" para que los pagadores puedan ajustar el valor antes de realizar el pago.' },
    { question: '¿Cómo veo el estado de mis pagos QR?', answer: 'En la página principal verás estadísticas en tiempo real: pendientes, pagados y cancelados. También puedes ver el historial completo en "Transacciones".' },
    { question: '¿Qué son las API Keys y para qué sirven?', answer: 'Las API Keys te permiten integrar Pagui con tu sistema o aplicación externa. Puedes crearlas desde tu perfil y usarlas para automatizar operaciones.' },
    { question: '¿Cuánto tiempo dura un código QR?', answer: 'Por defecto, los códigos QR expiran en 15 minutos, pero puedes configurar una fecha de vencimiento personalizada al generarlos.' },
    { question: '¿Cómo cambio mi contraseña?', answer: 'Ve a tu perfil y selecciona "Cambiar contraseña". Ingresa tu contraseña actual y la nueva contraseña para actualizarla.' },
    { question: '¿Puedo ver el historial de mis transacciones?', answer: 'Sí, accede a "Transacciones" desde el menú para ver todo tu historial de pagos y cobros, con filtros por fecha y estado.' },
  ];

  let chatInput = '';
  let chatMessages: { from: 'user' | 'bot', text: string }[] = [
    { from: 'bot', text: '¡Hola! ¿En qué podemos ayudarte hoy?' }
  ];
  let chatContainer: HTMLDivElement | null = null;

  function sendMessage() {
    if (chatInput.trim() === '') return;
    chatMessages = [...chatMessages, { from: 'user', text: chatInput }];
    const userMsg = chatInput;
    chatInput = '';
    setTimeout(() => {
      chatMessages = [...chatMessages, { from: 'bot', text: getBotReply(userMsg) }];
      scrollToBottom();
    }, 900);
    scrollToBottom();
  }

  function getBotReply(msg: string): string {
    msg = msg.toLowerCase();
    if (msg.includes('cuenta')) return 'Para crear una cuenta, haz clic en "Solicitar cuenta ahora" en la página principal.';
    if (msg.includes('contraseña')) return 'Puedes recuperar tu contraseña desde la pantalla de inicio de sesión.';
    if (msg.includes('transaccion')) return 'Puedes ver tus transacciones en la sección "Transacciones" del menú.';
    if (msg.includes('soporte') || msg.includes('contact')) return '¡Estás en el chat de soporte! ¿En qué más te ayudamos?';
    return 'Gracias por tu mensaje. Un agente te responderá pronto.';
  }

  function handleKeydown(e: KeyboardEvent) { if (e.key === 'Enter') sendMessage(); }
  function scrollToBottom() { setTimeout(() => { if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; }, 50); }
  onMount(scrollToBottom);
</script>

<PageLayout title="Soporte">

  <section class="faq-section">
    <span class="section-label"><MessageCircle size={16} /> Preguntas frecuentes</span>
    {#each faqs as faq}
      <details class="faq-item">
        <summary>{faq.question}</summary>
        <p>{faq.answer}</p>
      </details>
    {/each}
  </section>

  <section class="chat-section">
    <span class="section-label"><Send size={16} /> Chat en línea</span>
    <div class="chat-container" bind:this={chatContainer}>
      {#each chatMessages as msg}
        <div class="chat-message {msg.from}"><span>{msg.text}</span></div>
      {/each}
    </div>
    <div class="chat-input-row">
      <input type="text" placeholder="Escribe tu mensaje..." bind:value={chatInput} on:keydown={handleKeydown} autocomplete="off" />
      <button class="send-btn" on:click={sendMessage} aria-label="Enviar"><Send size={20} /></button>
    </div>
  </section>

</PageLayout>

<style>
  .faq-section { display: flex; flex-direction: column; gap: var(--space-2); }
  .faq-item { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); border: 1px solid rgba(var(--border-rgb), 0.3); cursor: pointer; }
  .faq-item summary { font-weight: 500; color: rgba(var(--text-primary-rgb), 1); outline: none; font-size: var(--text-sm); }
  .faq-item p { margin: var(--space-2) 0 0; color: rgba(var(--text-secondary-rgb), 1); font-size: var(--text-sm); line-height: 1.5; }
  .chat-section { display: flex; flex-direction: column; gap: var(--space-3); }
  .chat-container { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); padding: var(--space-3); height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-2); }
  .chat-message { max-width: 80%; padding: 0.5em 1em; border-radius: 16px; font-size: var(--text-sm); line-height: 1.4; word-break: break-word; align-self: flex-start; background: rgba(var(--bg-rgb), 1); color: rgba(var(--text-primary-rgb), 1); }
  .chat-message.user { align-self: flex-end; background: var(--primary); color: rgba(var(--bg-rgb), 1); }
  .chat-input-row { display: flex; gap: var(--space-2); }
  .chat-input-row input { flex: 1; padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.5); font-size: var(--text-sm); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-family: inherit; outline: none; }
  .chat-input-row input:focus { border-color: rgba(var(--primary-rgb), 0.6); }
  .send-btn { background: var(--primary); color: rgba(var(--bg-rgb), 1); border: none; border-radius: var(--radius-lg); padding: 0 var(--space-4); display: flex; align-items: center; justify-content: center; cursor: pointer; }
</style>
