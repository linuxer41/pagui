<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let variant: 'primary' | 'ghost' | 'outline' = 'primary';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let icon: any = null;
  export let iconPosition: 'left' | 'right' = 'right';
  
  const dispatch = createEventDispatcher();
  
  function handleClick(event: MouseEvent) {
    if (!disabled && !loading) {
      dispatch('click', event);
    }
  }
</script>

<button
  class="modern-button"
  class:primary={variant === 'primary'}
  class:ghost={variant === 'ghost'}
  class:outline={variant === 'outline'}
  class:small={size === 'small'}
  class:medium={size === 'medium'}
  class:large={size === 'large'}
  class:disabled
  class:loading
  on:click={handleClick}
  disabled={disabled || loading}
  type="button"
>
  <div class="button-content">
    {#if icon && iconPosition === 'left'}
      <div class="icon left">
        <svelte:component this={icon} size="18" />
      </div>
    {/if}
    
    <span class="text">
      {#if loading}
        <div class="loading-spinner"></div>
        <span>Cargando...</span>
      {:else}
        <slot />
      {/if}
    </span>
    
    {#if icon && iconPosition === 'right'}
      <div class="icon right">
        <svelte:component this={icon} size="18" />
      </div>
    {/if}
  </div>
  
  <!-- Efectos de elevación -->
  <div class="elevation-effect"></div>
  <div class="ripple-effect"></div>
  <div class="glow-effect"></div>
</button>

<style>
  .modern-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 16px;
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: hidden;
    background: transparent;
    color: inherit;
    min-height: 44px;
    padding: 0;
    transform: translateY(0) scale(1);
  }
  
  .button-content {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space);
    position: relative;
    z-index: 2;
  }
  
  /* Variantes */
  .primary {
    background: var(--gradient-primary);
    color: white;
    box-shadow: 
      0 4px 15px rgba(var(--primary), 0.3),
      0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s ease;
  }
  
  .primary:hover::before {
    left: 100%;
  }
  
  .ghost {
    background: rgba(var(--gray-100), 0.5);
    color: rgb(var(--gray-700));
    border: 1px solid rgba(var(--gray-300), 0.5);
    backdrop-filter: blur(10px);
  }
  
  .outline {
    background: transparent;
    color: rgb(var(--primary));
    border: 2px solid rgb(var(--primary));
  }
  
  /* Tamaños */
  .small .button-content {
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.85rem;
    min-height: 36px;
  }
  
  .medium .button-content {
    padding: var(--space-sm) var(--space);
    font-size: 0.95rem;
    min-height: 44px;
  }
  
  .large .button-content {
    padding: var(--space) var(--space-lg);
    font-size: 1.1rem;
    min-height: 52px;
  }
  
  /* Estados */
  .disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  .loading {
    cursor: wait;
  }
  
  /* Efectos hover */
  .modern-button:not(.disabled):hover {
    transform: translateY(-4px) scale(1.02);
  }
  
  .primary:not(.disabled):hover {
    box-shadow: 
      0 8px 25px rgba(var(--primary), 0.4),
      0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .ghost:not(.disabled):hover {
    background: rgba(var(--gray-200), 0.8);
    border-color: rgb(var(--gray-400));
    box-shadow: 0 4px 15px rgba(var(--gray-400), 0.2);
  }
  
  .outline:not(.disabled):hover {
    background: rgba(var(--primary), 0.1);
    box-shadow: 0 4px 15px rgba(var(--primary), 0.2);
  }
  
  /* Efectos de elevación */
  .elevation-effect {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(var(--primary), 0.15) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }
  
  .modern-button:not(.disabled):hover .elevation-effect {
    opacity: 1;
  }
  
  .glow-effect {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(var(--primary), 0.15) 0%, transparent 70%);
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.4s ease;
    pointer-events: none;
  }
  
  .modern-button:not(.disabled):hover .glow-effect {
    transform: translate(-50%, -50%) scale(1.5);
  }
  
  /* Ripple effect */
  .ripple-effect {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  /* Loading spinner */
  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: var(--space-xs);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Iconos */
  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
  }
  
  .icon.right {
    margin-left: var(--space-xs);
  }
  
  .icon.left {
    margin-right: var(--space-xs);
  }
  
  .modern-button:not(.disabled):hover .icon {
    transform: scale(1.1);
  }
  
  /* Focus */
  .modern-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(var(--primary), 0.3);
  }
  
  /* Active state */
  .modern-button:active:not(.disabled) {
    transform: translateY(-2px) scale(0.98);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .modern-button:not(.disabled):hover {
      transform: translateY(-2px) scale(1.01);
    }
    
    .large .button-content {
      padding: var(--space-sm) var(--space);
      font-size: 1rem;
    }
  }
</style>
