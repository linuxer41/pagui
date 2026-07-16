<script lang="ts">
  import { Search } from '@lucide/svelte'
  let { value = '', placeholder = 'Buscar', onInput = undefined as ((e: Event) => void) | undefined } = $props()
  let inputId = $state(`sf-${Math.random().toString(36).slice(2, 8)}`)
</script>

<div class="search-wrap">
  <Search size={14} class="search-icon" />
  <input type="text" bind:value {placeholder} oninput={onInput} class="search-input" id={inputId} aria-label={placeholder} />
</div>

<style>
  .search-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-m);
    background: var(--input);
  }
  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: var(--text-sm);
    color: var(--foreground);
    outline: none;
  }
  .search-input::placeholder { color: var(--muted-foreground); }
</style>
