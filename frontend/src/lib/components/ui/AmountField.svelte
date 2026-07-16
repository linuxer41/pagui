<script lang="ts">
  import { Wallet } from '@lucide/svelte'
  let { label = 'Monto', value = $bindable(0), currency = $bindable('BOB'), placeholder = '0.00', onInput = undefined as ((e: Event) => void) | undefined, disabled = false, error = '' } = $props()
  let symbol = $derived(currency === 'BOB' ? 'Bs' : '$')
  let inputId = $state(`af-${Math.random().toString(36).slice(2, 8)}`)
</script>

<div class="field">
  <label for={inputId} class="field-label">{label}</label>
  <div class="field-wrap" class:has-error={error}>
    <Wallet size={16} class="field-icon" />
    <span class="field-symbol">{symbol}</span>
    <input type="number" bind:value {placeholder} {disabled} oninput={onInput} class="field-input" min="0" step="0.01" id={inputId} />
    <select class="field-currency" bind:value={currency}>
      <option value="BOB">BOB</option>
      <option value="USD">USD</option>
    </select>
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
  .field-symbol { font-size: var(--text-sm); font-weight: 600; color: var(--muted-foreground); flex-shrink: 0; }
  .field-currency { background: transparent; border: none; color: var(--muted-foreground); font-size: var(--text-xs); font-weight: 500; outline: none; cursor: pointer; flex-shrink: 0; }
  .field-currency option { background: var(--background); color: var(--foreground); }
  .field-input {
    flex: 1; border: none; background: transparent;
    font-size: var(--text-sm); color: var(--foreground);
    outline: none; padding: 0;
  }
  .field-input::placeholder { color: var(--muted-foreground); }
  input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { appearance: textfield; -moz-appearance: textfield; }
  .field-error { font-size: var(--text-xs); color: var(--color-error-foreground); font-weight: 500; }
</style>
