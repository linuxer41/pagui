<main class="main-content">
    <slot />
  </main>

<style>
    .main-content {
        position: relative;
        z-index: 1;
        /* height: 100%; */
        min-height: 100%;
        margin: auto;
        max-width: 480px;
        width: 100%;
        @media screen and (max-width: 768px) {
            padding-top: 0;
            padding-bottom: 0;
            padding-bottom: 70px;
        }
    }
</style>