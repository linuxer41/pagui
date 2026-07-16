<script lang="ts">
  let { icon: Icon = undefined as any, title = '', message = '', action = '', onaction = undefined as (() => void) | undefined } = $props()
</script>

<div class="empty-state">
  {#if Icon}<div class="empty-icon"><Icon size={40} /></div>{/if}
  <span class="empty-title">{title}</span>
  {#if message}<span class="empty-message">{message}</span>{/if}
  {#if action}
    <button class="empty-action" onclick={onaction}>{action}</button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    padding: var(--space-8) var(--space-4); text-align: center;
  }
  .empty-icon { color: var(--muted-foreground); opacity: 0.5; }
  .empty-title { font-size: var(--text-lg); font-weight: 700; color: var(--foreground); }
  .empty-message { font-size: var(--text-sm); color: var(--muted-foreground); max-width: 260px; }
  .empty-action {
    margin-top: var(--space-2); padding: 10px 16px;
    border: none; border-radius: var(--radius-pill);
    background: var(--primary); color: var(--primary-foreground);
    font-size: var(--text-sm); font-weight: 500; cursor: pointer;
    transition: opacity var(--duration-fast); height: 40px;
  }
  .empty-action:active { opacity: 0.8; }
  .empty-action:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>
