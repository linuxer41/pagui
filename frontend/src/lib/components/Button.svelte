<script lang="ts">
  import { LoaderCircle } from '@lucide/svelte'
  let className = ''
  export { className as class }
  export let variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' = 'primary'
  export let size: 'sm' | 'md' | 'lg' = 'md'
  export let loading = false
  export let disabled = false
  export let fullWidth = false
  export let type: 'button' | 'submit' | 'reset' = 'button'
  export let icon: any = undefined
  export let iconPosition: 'left' | 'right' = 'left'
</script>

<button
  {type}
  class="btn btn-{variant} btn-{size} {fullWidth ? 'btn-full' : ''} {className}"
  {disabled}
  on:click
>
  {#if loading}
    <LoaderCircle class="btn-spinner" size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} />
  {:else}
    {#if icon && iconPosition === 'left'}
      <svelte:component this={icon} size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} />
    {/if}
    <span class="btn-label"><slot /></span>
    {#if icon && iconPosition === 'right'}
      <svelte:component this={icon} size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} />
    {/if}
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border: none;
    border-radius: var(--radius-lg);
    font-weight: 600;
    letter-spacing: var(--tracking-normal);
    transition: all var(--duration-normal) var(--ease-out);
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
  }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-full { width: 100%; }

  /* Sizes */
  .btn-sm { height: 32px; padding: 0 var(--space-3); font-size: var(--text-sm); border-radius: var(--radius-md); }
  .btn-md { height: 44px; padding: 0 var(--space-5); font-size: var(--text-base); }
  .btn-lg { height: 52px; padding: 0 var(--space-6); font-size: var(--text-lg); border-radius: var(--radius-xl); }

  /* Primary */
  .btn-primary {
    background: var(--primary-gradient);
    color: white;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
  }
  .btn-primary:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35); }
  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.08);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }
  .btn-primary:hover:not(:disabled)::after { opacity: 1; }

  /* Secondary */
  .btn-secondary {
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-xs);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--text-tertiary); }

  /* Danger */
  .btn-danger {
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: white;
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.2);
  }
  .btn-danger:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3); }

  /* Ghost */
  .btn-ghost {
    background: transparent;
    color: var(--text-secondary);
  }
  .btn-ghost:hover:not(:disabled) { background: var(--surface-hover); color: var(--text-primary); }

  /* Outline */
  .btn-outline {
    background: transparent;
    color: var(--primary-color);
    border: 1.5px solid var(--primary-color);
  }
  .btn-outline:hover:not(:disabled) { background: var(--primary-subtle); }

  /* Label */
  .btn-label { position: relative; z-index: 1; }

  /* Spinner */
  .btn-spinner { animation: spin 0.8s linear infinite; }
</style>
