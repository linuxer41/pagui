<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'

  onMount(() => {
    goto('/auth/login', { replaceState: true })
  })
</script>
