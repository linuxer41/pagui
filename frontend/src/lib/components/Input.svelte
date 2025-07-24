<script lang="ts">
  // Props
  export let id: string = '';
  export let name: string = '';
  export let type: string = 'text';
  export let value: string = '';
  export let placeholder: string = '';
  export let disabled: boolean = false;
  export let required: boolean = false;
  export let icon: any = null; // Componente de icono de Lucide
  export let label: string = '';
  export let error: string = '';
  
  // Clases CSS
  $: hasIcon = !!icon;
  $: hasError = !!error;
  $: isActive = !!value || document?.activeElement?.id === id;
  $: showPlaceholder = !label && placeholder;
</script>

<div class="input-field {hasError ? 'has-error' : ''} {disabled ? 'is-disabled' : ''}">
  <div class="input-wrapper">
    {#if hasIcon}
      <span class="input-icon">
        <svelte:component this={icon} size={16} strokeWidth={2} />
      </span>
    {/if}
    {#if type === 'textarea'}
      <textarea
        id={id}
        name={name}
        bind:value
        disabled={disabled}
        required={required}
        class:with-icon={hasIcon}
        class:active={isActive}
        aria-invalid={hasError}
        {...$$restProps}
        placeholder={showPlaceholder ? placeholder : undefined}
      ></textarea>
    {:else}
      <input
        id={id}
        name={name}
        type={type}
        bind:value
        disabled={disabled}
        required={required}
        class:with-icon={hasIcon}
        class:active={isActive}
        aria-invalid={hasError}
        {...$$restProps}
        placeholder={showPlaceholder ? placeholder : undefined}
      />
    {/if}
    {#if label}
      <label for={id} class:float={(value || document?.activeElement?.id === id)} class:with-icon={hasIcon}>{label}</label>
    {/if}
    <span class="input-outline"></span>
  </div>
  {#if hasError}
    <div class="input-error">{error}</div>
  {/if}
</div>

<style>
  .input-field {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--surface);
    border-radius: var(--border-radius-xl);
    box-shadow: 0 1px 2px rgba(60,60,60,0.04);
    transition: box-shadow 0.2s;
  }
  .input-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    z-index: 2;
    pointer-events: none;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  input, textarea {
    width: 100%;
    padding: 0.5rem 1rem 0.35rem 1rem;
    font-size: 1rem;
    border: none;
    border-radius: var(--border-radius-xl);
    background: transparent;
    color: var(--text-primary);
    font-family: inherit;
    outline: none;
    box-shadow: none;
    transition: background 0.2s;
    resize: none;
    letter-spacing: -0.01em;
    min-height: 54px;
  }
  input.with-icon, textarea.with-icon {
    padding-left: 2.75rem;
  }
  .input-wrapper:focus-within {
    box-shadow: 0 2px 8px var(--primary-color, #6750a4, 0.08);
  }
  .input-outline {
    position: absolute;
    inset: 0;
    border: 1.5px solid var(--text-tertiary);
    border-radius: var(--border-radius-xl);
    pointer-events: none;
    transition: border-color 0.2s;
    z-index: 1;
  }
  .input-wrapper:focus-within .input-outline {
    border-color: var(--primary-color);
  }
  .has-error .input-outline {
    border-color: #ff4c4c;
  }
  .is-disabled .input-outline {
    border-color: var(--background);
  }
  label {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    font-size: 0.85rem;
    background: transparent;
    pointer-events: none;
    transition: all 0.18s cubic-bezier(.4,0,.2,1);
    z-index: 3;
    padding: 0 0.25rem;
    font-weight: 500;
    line-height: 1.2;
    height: 1.2em;
    display: flex;
    align-items: center;
  }
  label.with-icon {
    left: 2.75rem;
  }
  label.float {
    top: 0.1rem;
    left: 1rem;
    font-size: 0.75rem;
    color: var(--primary-color);
    background: var(--surface);
    transform: none;
    line-height: 1.1;
    height: auto;
    align-items: flex-start;
  }
  label.float.with-icon { left: 2.75rem !important; }
  input:focus ~ label,
  textarea:focus ~ label,
  label.float {
    top: 0.1rem;
    font-size: 0.75rem;
    color: var(--primary-color);
    background: var(--surface);
    transform: none;
    line-height: 1.1;
    height: auto;
    align-items: flex-start;
  }
  input:disabled, textarea:disabled {
    background: transparent;
    color: var(--text-tertiary);
    cursor: not-allowed;
    opacity: 0.7;
  }
  .is-disabled label {
    color: var(--text-tertiary);
    opacity: 0.7;
  }
  .input-error {
    margin-top: 0.3rem;
    color: #ff4c4c;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 1.2em;
  }
  .has-error label {
    color: #ff4c4c;
  }
  .has-error .input-icon {
    color: #ff4c4c;
  }
  .has-error input,
  .has-error textarea {
    color: #ff4c4c;
  }
  textarea {
    min-height: 64px;
    padding-top: 0.9rem;
    padding-bottom: 0.35rem;
  }
  input:-webkit-autofill,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px var(--surface) inset !important;
    box-shadow: 0 0 0 1000px var(--surface) inset !important;
    -webkit-text-fill-color: var(--text-primary) !important;
    caret-color: var(--text-primary) !important;
    transition: background-color 9999s ease-in-out 0s;
  }
  input:-internal-autofill-selected {
    background-color: var(--surface) !important;
    color: var(--text-primary) !important;
  }
</style> 