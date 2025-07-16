import { writable } from 'svelte/store';

export interface Toast {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // ms
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  let id = 0;

  function show(message: string, type: Toast['type'] = 'info', duration = 3500) {
    id += 1;
    const toast: Toast = { id, message, type, duration };
    update((toasts) => [...toasts, toast]);
    setTimeout(() => {
      remove(toast.id);
    }, duration);
  }

  function remove(id: number) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }

  return {
    subscribe,
    show,
    remove
  };
}

export const toasts = createToastStore(); 