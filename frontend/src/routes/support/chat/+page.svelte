<script lang="ts">
  import { onMount } from 'svelte';
  import { Send } from '@lucide/svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';

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

<PageLayout title="Chat en línea">

  <div class="chat-container" bind:this={chatContainer}>
    {#each chatMessages as msg}
      <div class="chat-message {msg.from}"><span>{msg.text}</span></div>
    {/each}
  </div>
  <div class="chat-input-row">
    <input type="text" placeholder="Escribe tu mensaje..." bind:value={chatInput} onkeydown={handleKeydown} autocomplete="off" />
    <button class="send-btn" onclick={sendMessage} aria-label="Enviar"><Send size={20} /></button>
  </div>
</PageLayout>

<style>
  .chat-container { background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); padding: var(--space-3); flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-2); min-height: 300px; }
  .chat-message { max-width: 80%; padding: 0.5em 1em; border-radius: 16px; font-size: var(--text-sm); line-height: 1.4; word-break: break-word; align-self: flex-start; background: rgba(var(--bg-rgb), 1); color: rgba(var(--text-primary-rgb), 1); }
  .chat-message.user { align-self: flex-end; background: var(--primary); color: rgba(var(--bg-rgb), 1); }
  .chat-input-row { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
  .chat-input-row input { flex: 1; padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.5); font-size: var(--text-base); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); font-family: inherit; outline: none; }
  .chat-input-row input:focus { border-color: rgba(var(--primary-rgb), 0.6); }
  .send-btn { background: var(--primary); color: rgba(var(--bg-rgb), 1); border: none; border-radius: var(--radius-lg); padding: 0 var(--space-5); display: flex; align-items: center; justify-content: center; cursor: pointer; }
</style>
