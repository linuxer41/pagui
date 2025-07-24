<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Loader } from '@lucide/svelte';
  
  // Props
  export let variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let fullWidth: boolean = false;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let icon: any = null; // Componente de icono de Lucide
  export let iconPosition: 'left' | 'right' = 'left';
  
  // Eventos
  const dispatch = createEventDispatcher();
  
  // Clases CSS
  let classes = '';
  $: classes = `btn btn-${variant} size-${size} ${fullWidth ? 'full-width' : ''} ${iconPosition === 'right' ? 'icon-right' : ''}`;
  
  // Manejador de clic
  function handleClick(event: MouseEvent) {
    if (!disabled && !loading) {
      dispatch('click', event);
    }
  }
</script>

<button 
  {type} 
  class={classes} 
  disabled={disabled || loading} 
  on:click={handleClick}
  {...$$restProps}
>
  {#if loading}
    <span class="loader-icon">
      <Loader size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />
    </span>
  {:else if icon && iconPosition === 'left'}
    <span class="btn-icon">
      <svelte:component this={icon} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} strokeWidth={1.75} />
    </span>
  {/if}
  
  <span class="btn-text">
    <slot />
  </span>
  
  {#if icon && iconPosition === 'right' && !loading}
    <span class="btn-icon">
      <svelte:component this={icon} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} strokeWidth={1.75} />
    </span>
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease;
    user-select: none;
    position: relative;
    overflow: hidden;
    font-weight: 600;
    gap: 0.5rem;
    border-radius: var(--border-radius-xl);
    letter-spacing: -0.01em;
    min-height: 54px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
    color: white;
    box-shadow: 0 4px 10px rgba(58, 102, 255, 0.2);
  }
  
  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary-light), var(--primary-color));
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(58, 102, 255, 0.25);
  }
  
  .btn-primary:active:not(:disabled) {
    transform: scale(0.98);
    box-shadow: 0 2px 4px rgba(58, 102, 255, 0.15);
  }
  
  .btn-secondary {
    background: var(--surface);
    color: var(--primary-color);
    border: 1px solid rgba(58, 102, 255, 0.15);
  }
  
  .btn-secondary:hover:not(:disabled) {
    border-color: rgba(58, 102, 255, 0.3);
    transform: translateY(-1px);
  }
  
  .btn-secondary:active:not(:disabled) {
    transform: scale(0.98);
  }
  
  .btn-danger {
    background: linear-gradient(135deg, #FF5A69, #E53F4E);
    color: white;
    box-shadow: 0 4px 10px rgba(255, 71, 87, 0.2);
  }
  
  .btn-danger:hover:not(:disabled) {
    background: linear-gradient(135deg, #FF6B78, #FF5A69);
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(255, 71, 87, 0.25);
  }
  
  .btn-danger:active:not(:disabled) {
    transform: scale(0.98);
    box-shadow: 0 2px 4px rgba(255, 71, 87, 0.15);
  }
  
  .btn-ghost {
    background: transparent;
    color: var(--primary-color);
    border: none;
    box-shadow: none;
  }
  .btn-ghost:hover:not(:disabled) {
    background: rgba(58, 102, 255, 0.07);
    color: var(--primary-dark);
    transform: translateY(-1px);
  }
  .btn-ghost:active:not(:disabled) {
    background: rgba(58, 102, 255, 0.13);
    color: var(--primary-dark);
    transform: scale(0.98);
  }
  
  .btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none !important;
  }
  
  /* Tamaños */
  .size-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    min-height: 40px;
    border-radius: 10px;
  }
  
  .size-md {
    padding: 0.7rem 1.2rem;
    font-size: 0.95rem;
  }
  
  .size-lg {
    padding: 0.9rem 1.5rem;
    font-size: 1rem;
    min-height: 56px;
    border-radius: 14px;
  }
  
  .full-width {
    width: 100%;
  }
  
  /* Iconos */
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .icon-right {
    flex-direction: row-reverse;
  }
  
  .loader-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Efecto ripple */
  .btn::after {
    content: '';
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
    background-repeat: no-repeat;
    background-position: 50%;
    transform: scale(10, 10);
    opacity: 0;
    transition: transform 0.4s, opacity 0.5s;
  }
  
  .btn:active::after {
    transform: scale(0, 0);
    opacity: 0.3;
    transition: 0s;
  }
</style> 