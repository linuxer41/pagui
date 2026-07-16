<script lang="ts">
  import type { Snippet } from 'svelte'
  let { id = '', name = '', checked = $bindable(false), required = false, label = '', linkText = '', linkHref = '', disabled = false, children }: { id?: string; name?: string; checked?: boolean; required?: boolean; label?: string; linkText?: string; linkHref?: string; disabled?: boolean; children?: Snippet } = $props()
</script>

<label class="checkbox-label {disabled ? 'is-disabled' : ''}" for={id}>
  <input {id} {name} type="checkbox" bind:checked {required} {disabled} />
  <span class="checkbox-checkmark"></span>
  <span class="checkbox-text">
    {label}
    {#if linkText && linkHref}
      <a href={linkHref} class="checkbox-link" target="_blank" rel="noopener noreferrer">{linkText}</a>
    {/if}
    {#if children}{@render children()}{/if}
  </span>
</label>

<style>
  .checkbox-label {
    display: inline-flex;
    align-items: flex-start;
    gap: var(--space-3);
    font-size: var(--text-sm);
    line-height: 1.4;
    cursor: pointer;
    user-select: none;
    position: relative;
    color: rgba(var(--text-primary-rgb), 1);
  }
  .checkbox-label.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .checkbox-label input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .checkbox-checkmark {
    width: 20px;
    height: 20px;
    min-width: 20px;
    border: 2px solid var(--input);
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    margin-top: 1px;
  }
  .checkbox-checkmark::after {
    content: '';
    width: 6px;
    height: 10px;
    border: 2px solid var(--primary-foreground);
    border-top: none;
    border-left: none;
    transform: rotate(45deg) scale(0);
    transition: transform var(--duration-fast) var(--ease-spring);
    position: absolute;
    top: 1px;
  }
  .checkbox-label input:checked + .checkbox-checkmark {
    background: var(--primary);
    border-color: var(--primary);
  }
  .checkbox-label input:checked + .checkbox-checkmark::after {
    transform: rotate(45deg) scale(1);
  }
  .checkbox-label input:focus-visible + .checkbox-checkmark {
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
  }
  .checkbox-text {
    flex: 1;
  }
  .checkbox-link {
    color: var(--primary);
    text-decoration: none;
    margin-left: 0.2em;
  }
  .checkbox-link:hover {
    text-decoration: underline;
  }
</style>
