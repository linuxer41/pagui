<script lang="ts">
  import { onMount } from 'svelte';
  import { MessageCircle, Send } from '@lucide/svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';

  // Preguntas frecuentes
  const faqs = [
    {
      question: '¿Cómo genero un código QR para cobros?',
      answer: 'Ve a la sección "Código QR" desde el menú principal, ingresa el monto y descripción, y haz clic en "Generar QR". El código se creará con un tiempo de expiración configurable.'
    },
    {
      question: '¿Puedo modificar el monto después de generar el QR?',
      answer: 'Sí, al generar el QR puedes activar la opción "Permitir modificar monto" para que los pagadores puedan ajustar el valor antes de realizar el pago.'
    },
    {
      question: '¿Cómo veo el estado de mis pagos QR?',
      answer: 'En la página principal verás estadísticas en tiempo real: pendientes, pagados y cancelados. También puedes ver el historial completo en "Transacciones".'
    },
    {
      question: '¿Qué son las API Keys y para qué sirven?',
      answer: 'Las API Keys te permiten integrar Pagui con tu sistema o aplicación externa. Puedes crearlas desde tu perfil y usarlas para automatizar operaciones.'
    },
    {
      question: '¿Cuánto tiempo dura un código QR?',
      answer: 'Por defecto, los códigos QR expiran en 15 minutos, pero puedes configurar una fecha de vencimiento personalizada al generarlos.'
    },
    {
      question: '¿Cómo cambio mi contraseña?',
      answer: 'Ve a tu perfil y selecciona "Cambiar contraseña". Ingresa tu contraseña actual y la nueva contraseña para actualizarla.'
    },
    {
      question: '¿Puedo ver el historial de mis transacciones?',
      answer: 'Sí, accede a "Transacciones" desde el menú para ver todo tu historial de pagos y cobros, con filtros por fecha y estado.'
    }
  ];

  // Chat en línea (simulado)
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
      chatMessages = [
        ...chatMessages,
        { from: 'bot', text: getBotReply(userMsg) }
      ];
      scrollToBottom();
    }, 900);
    scrollToBottom();
  }

  function getBotReply(msg: string): string {
    // Respuestas automáticas simples
    msg = msg.toLowerCase();
    if (msg.includes('cuenta')) return 'Para crear una cuenta, haz clic en “Solicitar cuenta ahora” en la página principal.';
    if (msg.includes('contraseña')) return 'Puedes recuperar tu contraseña desde la pantalla de inicio de sesión.';
    if (msg.includes('transaccion')) return 'Puedes ver tus transacciones en la sección “Transacciones” del menú.';
    if (msg.includes('soporte') || msg.includes('contact')) return '¡Estás en el chat de soporte! ¿En qué más te ayudamos?';
    return 'Gracias por tu mensaje. Un agente te responderá pronto.';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') sendMessage();
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  }

  onMount(scrollToBottom);
</script>

<svelte:head>
  <title>Soporte y Ayuda | Pagui</title>
</svelte:head>

<RouteLayout title="Soporte">
<div class="support-page">
  <section class="faq-section">
    <h2><MessageCircle size={20} /> Preguntas frecuentes</h2>
    <ul>
      {#each faqs as faq}
        <li>
          <details>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        </li>
      {/each}
    </ul>
  </section>

  <section class="chat-section">
    <h2><Send size={20} /> Chat en línea</h2>
    <div class="chat-container" bind:this={chatContainer}>
      {#each chatMessages as msg}
        <div class="chat-message {msg.from}">
          <span>{msg.text}</span>
        </div>
      {/each}
    </div>
    <div class="chat-input-row">
      <input
        type="text"
        placeholder="Escribe tu mensaje..."
        bind:value={chatInput}
        on:keydown={handleKeydown}
        autocomplete="off"
      />
      <button class="send-btn" on:click={sendMessage} aria-label="Enviar">
        <Send size={20} />
      </button>
    </div>
  </section>
</div>
</RouteLayout>

<style>
  .support-page {
    max-width: 480px;
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }
  .faq-section h2, .chat-section h2 {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.1rem;
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
    font-weight: 600;
  }
  .faq-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .faq-section details {
    background: var(--surface);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    border: 1px solid var(--border-color);
  }
  .faq-section summary {
    font-weight: 500;
    color: var(--text-primary);
    outline: none;
  }
  .faq-section p {
    margin: var(--spacing-xs) 0 0 0;
    color: var(--text-secondary);
    font-size: 0.97rem;
  }
  .chat-section {
    margin-top: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  .chat-container {
    background: var(--surface);
    border-radius: var(--border-radius-md);
    border: 1px solid var(--border-color);
    padding: var(--spacing-md);
    height: 220px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .chat-message {
    max-width: 80%;
    padding: 0.5em 1em;
    border-radius: 16px;
    font-size: 0.98rem;
    line-height: 1.4;
    word-break: break-word;
    margin-bottom: 2px;
    align-self: flex-start;
    background: var(--background);
    color: var(--text-primary);
  }
  .chat-message.user {
    align-self: flex-end;
    background: var(--primary-color);
    color: white;
  }
  .chat-message.bot {
    align-self: flex-start;
    background: var(--surface);
    color: var(--text-primary);
  }
  .chat-input-row {
    display: flex;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }
  .chat-input-row input {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    border: 1px solid var(--border-color);
    font-size: 1rem;
    background: var(--surface);
    color: var(--text-primary);
    font-family: inherit;
  }
  .send-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 1em;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.18s;
  }
  .send-btn:hover {
    background: var(--primary-dark);
  }
</style> 