import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { M3 } from 'tauri-plugin-m3';

export type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (!browser) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function createThemeStore() {
  // Default to 'system' if no preference is stored
  const storedTheme = browser ? localStorage.getItem('theme') as Theme : null;
  const initial = storedTheme || 'system';
  const { subscribe, set, update } = writable<Theme>(initial);

  async function applyTheme(theme: Theme) {
    if (!browser) return;
    document.documentElement.setAttribute('data-theme', theme);
    await M3.setBarColor(theme === 'light' ? 'dark' : 'light');
  }

  subscribe((theme) => {
    if (browser) {
      localStorage.setItem('theme', theme);
      applyTheme(theme);
    }
  });

  // Escuchar cambios del sistema
  if (browser && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem('theme') === 'system') {
        applyTheme('system');
      }
    });
  }

  async function toggle() {
    const currentTheme = get({ subscribe });
    console.log(currentTheme);
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    set(newTheme);
    await applyTheme(newTheme);
  }

  return {
    subscribe,
    set,
    update,
    toggle,
    applyTheme
  };
}

export const theme = createThemeStore(); 