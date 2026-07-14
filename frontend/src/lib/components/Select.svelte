<script lang="ts">
  let className = ''
  export { className as class }
  export let id: string = ''
  export let name: string = ''
  export let value: string = ''
  export let disabled: boolean = false
  export let required: boolean = false
  export let icon: any = null
  export let label: string = ''
  export let error: string = ''
  export let options: { value: string, label: string }[] = []
</script>

<div class="select-field {error ? 'has-error' : ''} {disabled ? 'is-disabled' : ''} {className}">
  {#if label}
    <label for={id} class="select-label">{label}</label>
  {/if}

  <div class="select-wrapper">
    {#if icon}
      <span class="select-icon">
        <svelte:component this={icon} size={18} />
      </span>
    {/if}

    <select
      {id}
      {name}
      bind:value
      {disabled}
      {required}
      class:has-icon={!!icon}
    >
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
      <slot></slot>
    </select>

    <span class="select-arrow"></span>
  </div>

  {#if error}
    <div class="select-error">{error}</div>
  {/if}
</div>

<style>
  .select-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .select-label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .select-wrapper {
    position: relative;
  }

  .select-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    z-index: 1;
    transition: color var(--duration-fast) var(--ease-out);
  }

  select {
    width: 100%;
    height: 48px;
    padding: 0 40px 0 14px;
    font-size: var(--text-base);
    color: var(--text-primary);
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    appearance: none;
    -webkit-appearance: none;
    outline: none;
  }

  select.has-icon {
    padding-left: 44px;
  }

  select:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-subtle);
  }

  select:focus + .select-arrow {
    transform: translateY(-50%) rotate(180deg);
    color: var(--primary-color);
  }

  select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-secondary);
  }

  .select-arrow {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    border-right: 2px solid var(--text-tertiary);
    border-bottom: 2px solid var(--text-tertiary);
    transform: translateY(-70%) rotate(45deg);
    transition: all var(--duration-fast) var(--ease-out);
    pointer-events: none;
  }

  .has-error select {
    border-color: var(--error-color);
  }

  .has-error select:focus {
    box-shadow: 0 0 0 3px var(--error-bg);
  }

  .has-error .select-icon {
    color: var(--error-color);
  }

  .select-error {
    font-size: var(--text-xs);
    color: var(--error-color);
    font-weight: 500;
  }
</style>