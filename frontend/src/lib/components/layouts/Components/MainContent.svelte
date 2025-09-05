<main class="main-content">
    <slot />
  </main>

<style>
    .main-content {
        position: relative;
        z-index: 1;
        /* hei ght: 100%; */
        min-height: 100%;
        margin: auto;
        max-width: 480px;
        width: 100%;
        /* Estilo único para todas las resoluciones */
    }
</style>