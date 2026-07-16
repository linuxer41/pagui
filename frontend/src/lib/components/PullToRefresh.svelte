<script lang="ts">
  import type { Snippet } from 'svelte'
  let { onrefresh = async () => {}, children }: { onrefresh?: () => Promise<void>; children?: Snippet } = $props()

  let touchStartY = 0
  let pulling = $state(false)
  let refreshing = $state(false)
  let pullDistance = $state(0)
  const threshold = 80

  function handleTouchStart(e: TouchEvent) {
    if (document.documentElement.scrollTop <= 0) {
      touchStartY = e.touches[0].clientY
      pulling = true
    }
  }
  function handleTouchMove(e: TouchEvent) {
    if (!pulling || refreshing) return
    const dy = e.touches[0].clientY - touchStartY
    if (dy > 0) {
      pullDistance = Math.min(dy * 0.5, threshold * 1.5)
    }
  }
  async function handleTouchEnd() {
    if (!pulling) return
    pulling = false
    if (pullDistance >= threshold) {
      refreshing = true
      try { await onrefresh() } catch {} finally { refreshing = false }
    }
    pullDistance = 0
  }
</script>

<div
  class="ptr"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  style={pullDistance > 0 ? `transform: translateY(${pullDistance}px); transition: none` : ''}
>
  {#if refreshing || pullDistance > 0}
    <div class="ptr-indicator" class:refreshing>
      {#if refreshing}
        <span class="ptr-spinner"></span>
      {:else if pullDistance >= threshold}
        <span class="ptr-arrow reverse">↓</span>
      {:else}
        <span class="ptr-arrow">↓</span>
      {/if}
    </div>
  {/if}
  {#if children}{@render children()}{/if}
</div>

<style>
  .ptr { transition: transform 0.3s ease; }
  .ptr-indicator {
    display: flex; align-items: center; justify-content: center;
    height: 50px; color: rgba(var(--text-tertiary-rgb), 1);
  }
  .ptr-indicator.refreshing { height: 50px; }
  .ptr-arrow { font-size: 20px; transition: transform 0.2s; }
  .ptr-arrow.reverse { transform: rotate(180deg); }
  .ptr-spinner {
    width: 22px; height: 22px;
    border: 2px solid rgba(var(--border-rgb), 0.5);
    border-top-color: var(--primary);
    border-radius: 50%; animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
