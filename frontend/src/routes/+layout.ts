// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)

import { goto } from "$app/navigation";
import { get } from "svelte/store";
import { auth } from "$lib/stores/auth";

// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const prerender = true;
export const ssr = false;

export const load = async ({ url }) => {
     const path = url.pathname;
     console.log({path});
        
        // Si no está en la página de login y no está autenticado, redirigir a login
    if (path !== '/login' && !get(auth).isAuthenticated) {
        goto('/login');
    }
        
    return {
        path
    }
};

