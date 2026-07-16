<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  let online = $state(true)

  function update() { online = navigator.onLine }

  onMount(() => {
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  })
  onDestroy(() => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  })
</script>

{#if !online}
  <div class="offline-bar">Sin conexión</div>
{/if}

<style>
  .offline-bar {
    position: sticky; top: 0; z-index: 150;
    background: rgba(var(--error-rgb), 0.15);
    color: rgba(var(--error-rgb), 1);
    text-align: center; padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm); font-weight: 600;
    backdrop-filter: blur(8px);
  }
</style>
