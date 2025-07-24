<script lang="ts">
    import { page } from '$app/state';
    import AppHeader from './Components/AppHeader.svelte';
    import MainContent from './Components/MainContent.svelte';
    export let title: string;
    export let showBack: boolean = true;
</script>

{#key page.url.pathname}
<div class="blank-page">
  <AppHeader title={title} showBack={showBack} />
  <MainContent>
    <slot />
  </MainContent>
</div>
{/key}

<style>
  .blank-page {
    min-height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--background);
    position: relative;
    overflow: hidden;
  }
</style> 