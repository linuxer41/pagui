<script lang="ts">
  let { width = '100%', height = '20px', radius = 'md', count = 1, gap = 'space-2' } = $props()
</script>

<div class="skeleton-group" style="gap: var(--{gap})">
  {#each Array(count) as _}
    <div class="skeleton" style="width: {width}; height: {height}; border-radius: var(--radius-{radius})"></div>
  {/each}
</div>

<style>
  .skeleton-group { display: flex; flex-direction: column; }
  .skeleton {
    background: linear-gradient(90deg,
      rgba(var(--surface-rgb), 1) 25%,
      rgba(var(--border-rgb), 0.3) 50%,
      rgba(var(--surface-rgb), 1) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
