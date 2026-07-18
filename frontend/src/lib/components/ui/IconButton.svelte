<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    onclick,
    label,
    children,
  }: { onclick: () => void; label: string; children: Snippet } = $props();
</script>

<button class="icon-btn" {onclick} aria-label={label}>
  {@render children()}
</button>

<style>
  .icon-btn { width: 44px; height: 44px; border-radius: var(--radius-full); border: none; background: rgba(var(--surface-rgb), 1); display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(var(--text-secondary-rgb), 1); flex-shrink: 0; position: relative; }
  .icon-btn:active { opacity: 0.7; }
</style>
