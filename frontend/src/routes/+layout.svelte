<script lang="ts">
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  import { theme } from '$lib/stores/theme';

  import { onMount } from 'svelte';
  import { M3 } from "tauri-plugin-m3";
  import '../app.css';
  
  // Verificar token expirado
  onMount(async () => {
    // get insets for compensating EdgeToEdge display
    // either already scale compensated or raw
    let deviceInsets = await M3.getInsets();
    if (deviceInsets && deviceInsets.adjustedInsetTop) {
      // Creamos una regla CSS que modifica las propiedades :root
      const style = document.createElement('style');
      style.innerHTML = `
        :root {
          --adjust-top: ${deviceInsets.adjustedInsetTop}px;
          --adjust-bottom: ${deviceInsets.adjustedInsetBottom}px;
        }
      `;
      document.head.appendChild(style);
      
      // Debugear si las variables CSS se están aplicando correctamente
      console.log('--adjust-top:', getComputedStyle(document.documentElement).getPropertyValue('--adjust-top'));
      console.log('--adjust-bottom:', getComputedStyle(document.documentElement).getPropertyValue('--adjust-bottom'));
    }
    await theme.applyTheme($theme);
  });
  
  // Obtener la ruta actual
  $: currentPath = $page.url.pathname;
  
  // Determinar si es la página principal
  $: isMainPage = currentPath === '/';
</script>

<Toast />

<!-- Estructura del layout básica -->
{#if currentPath.startsWith('/auth/') || currentPath.startsWith('/init')}
  <!-- Sin layout para páginas de autenticación o inicialización -->
  <slot />
{:else}
  <!-- Para cualquier otra página (incluyendo la principal), mostramos el slot directo -->
  <slot />
{/if}
