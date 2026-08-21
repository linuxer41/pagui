<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { get } from 'svelte/store'
  import { auth } from '$lib/stores/auth'

  onMount(() => {
    // Si hay sesión, ir directo al dashboard.
    // Si no la hay, el +layout.svelte redirige a /login.
    if (get(auth).isAuthenticated) {
      goto('/dashboard', { replaceState: true })
    }
  })
</script>

<div class="layout" style="align-items:center;justify-content:center">
  <p style="color:var(--text-tertiary)">Cargando...</p>
</div>
