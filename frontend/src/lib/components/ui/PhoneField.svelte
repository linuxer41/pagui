<script lang="ts">
  import { Phone } from '@lucide/svelte'
  let { label = 'Teléfono', value = $bindable(''), placeholder = 'Ej. 71234567', onInput = undefined as ((e: Event) => void) | undefined, disabled = false, error = '' } = $props()
  let inputId = $state(`ph-${Math.random().toString(36).slice(2, 8)}`)
</script>

<div class="field">
  <label for={inputId} class="field-label">{label}</label>
  <div class="field-wrap" class:has-error={error}>
    <Phone size={16} class="field-icon" />
    <span class="field-prefix">+591</span>
    <input type="tel" bind:value {placeholder} {disabled} oninput={onInput} class="field-input" id={inputId} />
  </div>
  {#if error}
    <span class="field-error" role="alert">{error}</span>
  {/if}
</div>

<style>
  .field { display: flex; flex-direction: column; gap: var(--space-1); }
  .field-label { font-size: var(--text-sm); font-weight: 500; color: var(--foreground); letter-spacing: 0; cursor: pointer; }
  .field-wrap {
    display: flex; align-items: center; gap: var(--space-2);
    border: 1px solid var(--input); border-radius: var(--radius-m);
    padding: var(--space-2) var(--space-3); min-height: 40px;
    transition: border-color var(--duration-fast);
    background: var(--background);
  }
  .field-wrap:focus-within { border-color: var(--ring); }
  .field-wrap.has-error { border-color: var(--color-error-foreground); }
  .field-prefix { font-size: var(--text-sm); color: var(--muted-foreground); font-weight: 500; flex-shrink: 0; }
  .field-input {
    flex: 1; border: none; background: transparent;
    font-size: var(--text-sm); color: var(--foreground);
    outline: none; padding: 0;
  }
  .field-input::placeholder { color: var(--muted-foreground); }
  .field-error { font-size: var(--text-xs); color: var(--color-error-foreground); font-weight: 500; }
</style>
