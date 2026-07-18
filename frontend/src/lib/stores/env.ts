import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createEnvStore() {
  const initial = browser ? (localStorage.getItem('env') || 'sandbox') : 'sandbox'
  const { subscribe, set } = writable<string>(initial)

  return {
    subscribe,
    set: (v: string) => {
      if (browser) localStorage.setItem('env', v)
      set(v)
    },
    clear: () => {
      if (browser) localStorage.removeItem('env')
      set('sandbox')
    }
  }
}

export const envStore = createEnvStore()
