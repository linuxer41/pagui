import api from "$lib/api";

export async function load({ url }) {
    const qrId = url.searchParams.get('id');
    
    // No retornamos error si no hay ID, lo manejamos en el componente
    // para permitir múltiples fuentes de datos (URL, localStorage, etc.)
    
    return { 
        qrId: qrId || null 
    };
}

export const ssr = false;

export const prerender = false;
