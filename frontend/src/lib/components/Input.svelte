<script lang="ts">
  let className = ''
  export { className as class }
  export let id: string
  export let name: string | undefined = undefined
  export let type: string = 'text'
  export let value: string | number | undefined = undefined
  export let placeholder: string = ''
  export let disabled: boolean = false
  export let required: boolean = false
  export let icon: any = undefined
  export let label: string = ''
  export let error: string = ''
  export let autocomplete: string | undefined = undefined
</script>

<div class="input-wrapper {error ? 'has-error' : ''} {disabled ? 'is-disabled' : ''} {icon ? 'has-icon' : ''} {className}">
  {#if icon}
    <svelte:component this={icon} class="input-icon" size={18} />
  {/if}
  <input
    {id}
    {name}
    {type}
    bind:value
    {placeholder}
    {disabled}
    {required}
    autocomplete={autocomplete as any}
    class="input-field"
    class:has-value={value !== '' && value !== undefined}
  />
  {#if label}
    <label for={id} class="input-label">{label}</label>
  {/if}
  {#if error}
    <span class="input-error">{error}</span>
  {/if}
</div>

<style>
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-lg);
    transition: all var(--duration-normal) var(--ease-out);
    min-height: 52px;
  }
  .input-wrapper:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-subtle);
  }
  .input-wrapper.has-error {
    border-color: var(--error-color);
  }
  .input-wrapper.has-error:focus-within {
    box-shadow: 0 0 0 3px var(--error-bg);
  }
  .input-wrapper.is-disabled {
    opacity: 0.5;
    background: var(--bg-secondary);
  }

  .input-icon {
    position: absolute;
    left: 14px;
    color: var(--text-tertiary);
    pointer-events: none;
    flex-shrink: 0;
    z-index: 1;
  }
  .input-wrapper:focus-within .input-icon { color: var(--primary-color); }
  .input-wrapper.has-error .input-icon { color: var(--error-color); }

  .input-field {
    width: 100%;
    height: 100%;
    min-height: 52px;
    padding: 22px 14px 6px;
    border: none;
    background: transparent;
    font-size: var(--text-base);
    color: var(--text-primary);
    outline: none;
    line-height: 1.25;
  }
  .input-wrapper.has-icon .input-field { padding-left: 42px; }

  .input-label {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--text-base);
    color: var(--text-tertiary);
    pointer-events: none;
    transition: all var(--duration-fast) var(--ease-out);
    transform-origin: left center;
  }
  .input-field:focus + .input-label,
  .input-field.has-value + .input-label,
  .input-field:not(:placeholder-shown) + .input-label {
    top: 10px;
    transform: translateY(0) scale(0.8);
    color: var(--primary-color);
  }
  .input-wrapper.has-icon .input-label { left: 42px; }

  .input-error {
    position: absolute;
    bottom: -18px;
    left: 0;
    font-size: var(--text-xs);
    color: var(--error-color);
    font-weight: 500;
  }
</style>