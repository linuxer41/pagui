<script lang="ts">
  export let id: string = '';
  export let name: string = '';
  export let checked: boolean = false;
  export let required: boolean = false;
  export let label: string = '';
  export let linkText: string = '';
  export let linkHref: string = '';
  export let disabled: boolean = false;
</script>

<label class="checkbox-label" for={id}>
  <input
    id={id}
    name={name}
    type="checkbox"
    bind:checked
    required={required}
    disabled={disabled}
  />
  <span>
    {label}
    {#if linkText && linkHref}
      <a href={linkHref} class="terms-link" target="_blank" rel="noopener noreferrer">{linkText}</a>
    {/if}
  </span>
</label>

<style>
  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    font-size: 0.85rem;
    line-height: 1.4;
    cursor: pointer;
    user-select: none;
  }
  .checkbox-label input[type="checkbox"] {
    margin-top: 2px;
    accent-color: var(--primary-color);
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1.5px solid var(--border-color);
    cursor: pointer;
  }
  .terms-link {
    color: var(--primary-color);
    text-decoration: none;
    margin-left: 0.2em;
  }
  .terms-link:hover {
    text-decoration: underline;
  }
</style> 