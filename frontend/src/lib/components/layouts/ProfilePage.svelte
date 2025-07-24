<script lang="ts">
  import AppHeader from './Components/AppHeader.svelte';
  import MainContent from './Components/MainContent.svelte';
  export let title: string = '';
  export let showBack: boolean = true;
</script>

<div class="auth-page-wrapper">
  <AppHeader title={title} showBack={showBack} />
  <MainContent>
    <slot />
  </MainContent>
</div>

<style>
 .auth-page-wrapper {
  padding-top: 0px;
  padding-top: 0px;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  min-height: 100%;
  background: var(--background);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}


</style>
        