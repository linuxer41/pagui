<script lang="ts">
  import { Lock, Eye, EyeOff } from '@lucide/svelte'
  let { label = 'Contraseña', value = $bindable(''), placeholder = 'Ingresa tu contraseña', onInput = undefined as ((e: Event) => void) | undefined, disabled = false, error = '' } = $props()
  let show = $state(false)
  let inputId = $state(`pf-${Math.random().toString(36).slice(2, 8)}`)
</script>

<div class="field">
  <label for={inputId} class="field-label">{label}</label>
  <div class="field-wrap" class:has-error={error}>
    <Lock size={16} class="field-icon" />
    <input type={show ? 'text' : 'password'} bind:value {placeholder} {disabled} oninput={onInput} class="field-input" id={inputId} />
    <button class="toggle" onclick={() => show = !show} aria-label={show ? 'Ocultar' : 'Mostrar'} type="button">
      {#if show}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
    </button>
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
  .field-input {
    flex: 1; border: none; background: transparent;
    font-size: var(--text-sm); color: var(--foreground);
    outline: none; padding: 0;
  }
  .field-input::placeholder { color: var(--muted-foreground); }
  .toggle {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border: none; border-radius: var(--radius-full);
    background: transparent; color: var(--muted-foreground);
    cursor: pointer; flex-shrink: 0;
  }
  .toggle:hover { color: var(--foreground); }
  .toggle:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .field-error { font-size: var(--text-xs); color: var(--color-error-foreground); font-weight: 500; }
</style>
