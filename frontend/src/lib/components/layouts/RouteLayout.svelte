<script lang="ts">
  import { goto } from '$app/navigation';
  import { ArrowLeft } from '@lucide/svelte';

  export let title = "";
</script>

<div class="route-layout safe-area-top">
  <header class="route-header">
    <button class="back-button" on:click={() => goto('/')}>
      <ArrowLeft size={18} />
    </button>
    <h1 class="page-title">{title}</h1>
    <div class="header-right">
      <slot name="right"></slot>
    </div>
  </header>
  <div class="route-content">
    <slot />
  </div>
</div>

<style>
  .route-layout {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    width: 100%;
  }

  .route-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 0.75rem;
    background-color: var(--background);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .back-button {
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.5rem;
    transition: opacity 0.2s ease;
    padding: 0;
  }

  .back-button:hover {
    opacity: 0.7;
  }

  .page-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
    flex: 1;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .route-content {
    flex: 1;
    padding: 0.5rem 1rem 1rem;
  }
</style>
