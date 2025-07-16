import { writable } from 'svelte/store';

export type Lang = 'es' | 'en';

function createLangStore() {
  const initial = (localStorage.getItem('lang') as Lang) || 'es';
  const { subscribe, set } = writable<Lang>(initial);

  subscribe((lang) => {
    localStorage.setItem('lang', lang);
  });

  return {
    subscribe,
    set
  };
}

export const lang = createLangStore(); 