<script lang="ts">
  // Props
  export let id: string = '';
  export let name: string = '';
  export let value: string = '';
  export let disabled: boolean = false;
  export let required: boolean = false;
  export let icon: any = null; // Componente de icono de Lucide
  export let label: string = '';
  export let error: string = '';
  export let options: { value: string, label: string }[] = [];
  
  // Clases CSS
  $: hasIcon = !!icon;
  $: hasError = !!error;
</script>

<div class="select-field">
  {#if label}
    <label for={id}>{label}</label>
  {/if}
  
  <div class="select-wrapper" class:has-error={hasError}>
    {#if hasIcon}
      <span class="select-icon">
        <svelte:component this={icon} size={18} strokeWidth={1.75} />
      </span>
    {/if}
    
    <select
      {id}
      {name}
      bind:value
      {disabled}
      {required}
      class:with-icon={hasIcon}
      {...$$restProps}
    >
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
      <slot></slot>
    </select>
    
    <span class="select-arrow"></span>
  </div>
  
  {#if hasError}
    <div class="select-error">{error}</div>
  {/if}
</div>

<style>
  .select-field {
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
  
  .select-wrapper {
    position: relative;
  }
  
  .select-icon {
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
  
  select {
    width: 100%;
    padding: 0.8rem 0.9rem;
    padding-right: 2.5rem;
    font-size: 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    background-color: var(--surface);
    transition: var(--hover-transition);
    appearance: none;
    -webkit-appearance: none;
    color: var(--text-primary);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    min-height: 3rem;
  }
  
  select.with-icon {
    padding-left: 2.75rem;
  }
  
  select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(58, 102, 255, 0.1);
  }
  
  select:focus + .select-icon {
    color: var(--primary-color);
  }
  
  select:disabled {
    background-color: var(--surface-hover);
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .select-arrow {
    position: absolute;
    right: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    width: 0.9rem;
    height: 0.9rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234A5163' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    transition: var(--hover-transition);
  }
  
  select:focus ~ .select-arrow {
    transform: translateY(-50%) rotate(180deg);
  }
  
  .has-error select {
    border-color: var(--error-color);
  }
  
  .has-error select:focus {
    box-shadow: 0 0 0 3px rgba(233, 58, 74, 0.1);
  }
  
  .has-error .select-icon {
    color: var(--error-color);
  }
  
  .select-error {
    margin-top: 0.25rem;
    color: var(--error-color);
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .select-error::before {
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
</style> 