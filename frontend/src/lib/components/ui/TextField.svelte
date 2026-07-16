<script lang="ts">
  let { label = '', value = $bindable(''), placeholder = '', onInput = undefined as ((e: Event) => void) | undefined, type = 'text' as string, disabled = false, autocomplete = undefined as any, error = '' } = $props()
  let inputId = $state(`tf-${Math.random().toString(36).slice(2, 8)}`)
</script>

<div class="field">
  {#if label}
    <label for={inputId} class="field-label">{label}</label>
  {/if}
  <div class="field-wrap" class:has-error={error}>
    <input {type} bind:value {placeholder} {disabled} autocomplete={autocomplete} oninput={onInput} class="field-input" id={inputId} />
  </div>
  {#if error}
    <span class="field-error" role="alert">{error}</span>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .field-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--foreground);
    letter-spacing: 0;
  }
  .field-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border: 1px solid var(--input);
    border-radius: var(--radius-m);
    padding: var(--space-2) var(--space-3);
    min-height: 40px;
    transition: border-color var(--duration-fast);
    background: var(--background);
  }
  .field-wrap:focus-within { border-color: var(--ring); }
  .field-wrap.has-error { border-color: var(--color-error-foreground); }
  .field-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: var(--text-sm);
    color: var(--foreground);
    outline: none;
    padding: 0;
  }
  .field-input::placeholder { color: rgba(var(--text-tertiary-rgb), 0.5); }
  .field-input:disabled { opacity: 0.4; }
  .field-error { font-size: var(--text-xs); color: rgba(var(--error-rgb), 1); font-weight: 500; }
</style>
