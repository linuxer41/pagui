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
</script>

<div class="input-field">
  {#if label}
    <label for={id}>{label}</label>
  {/if}
  
  <div class="input-wrapper" class:has-error={hasError}>
    {#if hasIcon}
      <span class="input-icon">
        <svelte:component this={icon} size={18} strokeWidth={1.75} />
      </span>
    {/if}
    
    {#if type === 'textarea'}
      <textarea
        {id}
        {name}
        bind:value
        {placeholder}
        {disabled}
        {required}
        class:with-icon={hasIcon}
        {...$$restProps}
      ></textarea>
    {:else}
      <input
        {id}
        {name}
        {type}
        bind:value
        {placeholder}
        {disabled}
        {required}
        class:with-icon={hasIcon}
        {...$$restProps}
      />
    {/if}
  </div>
  
  {#if hasError}
    <div class="input-error">{error}</div>
  {/if}
</div>

<style>
  .input-field {
    margin-bottom: var(--spacing-lg);
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
    font-size: 1rem;
    transition: var(--hover-transition);
  }
  
  .input-wrapper {
    position: relative;
  }
  
  .input-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    transition: var(--hover-transition);
  }
  
  input, textarea {
    width: 100%;
    padding: 0.8rem 0.9rem;
    font-size: 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    background-color: var(--surface);
    transition: var(--hover-transition);
    appearance: none;
    -webkit-appearance: none;
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }
  
  input.with-icon, textarea.with-icon {
    padding-left: 2.75rem;
  }
  
  input:focus, textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(58, 102, 255, 0.1);
  }
  
  input:focus + .input-icon, textarea:focus + .input-icon {
    color: var(--primary-color);
  }
  
  input:disabled, textarea:disabled {
    background-color: var(--surface-hover);
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  textarea {
    min-height: 100px;
    resize: vertical;
  }
  
  .has-error input, .has-error textarea {
    border-color: var(--error-color);
  }
  
  .has-error input:focus, .has-error textarea:focus {
    box-shadow: 0 0 0 3px rgba(233, 58, 74, 0.1);
  }
  
  .has-error .input-icon {
    color: var(--error-color);
  }
  
  .input-error {
    margin-top: 0.25rem;
    color: var(--error-color);
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .input-error::before {
    content: "!";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background-color: var(--error-color);
    color: white;
    border-radius: 50%;
    font-size: 0.625rem;
    font-weight: bold;
  }
  
  /* Ajuste para textarea con icono */
  textarea.with-icon + .input-icon {
    top: 1.25rem;
    transform: none;
  }
</style> 