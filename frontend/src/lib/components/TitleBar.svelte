<script lang="ts">
  import { browser } from '$app/environment';
  import { Minus, X } from '@lucide/svelte';

  const isDesktopApp =
    browser &&
    '__TAURI_INTERNALS__' in window &&
    !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  if (isDesktopApp) {
    document.documentElement.style.setProperty('--titlebar-height', '40px');
    document.documentElement.classList.add('is-desktop-shell');
  }

  async function minimize() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  }

  async function close() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  }
</script>

{#if isDesktopApp}
  <div class="titlebar" data-tauri-drag-region>
    <div class="brand" data-tauri-drag-region>
      <span class="dot" data-tauri-drag-region></span>
      <span class="name" data-tauri-drag-region>Pagui</span>
    </div>
    <div class="controls">
      <button class="ctrl" aria-label="Minimizar" onclick={minimize}>
        <Minus size={15} strokeWidth={2} />
      </button>
      <button class="ctrl close" aria-label="Cerrar" onclick={close}>
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  </div>
{/if}

<style>
  .titlebar {
    height: var(--titlebar-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 14px;
    background: rgba(var(--bg-rgb), 1);
    user-select: none;
    -webkit-user-select: none;
    cursor: default;
    position: relative;
    z-index: 1000;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: default;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.55);
  }

  .name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(var(--text-primary-rgb), 0.9);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 100%;
    padding-right: 6px;
  }

  .ctrl {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 30px;
    border: none;
    background: transparent;
    border-radius: 9px;
    color: rgba(var(--text-secondary-rgb), 1);
    cursor: pointer;
    transition:
      background var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .ctrl:hover {
    background: rgba(var(--surface-alt-rgb), 1);
    color: rgba(var(--text-primary-rgb), 1);
  }

  .ctrl.close:hover {
    background: #e81123;
    color: #ffffff;
  }

  .ctrl:active {
    opacity: 0.85;
  }
</style>
