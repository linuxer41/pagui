import { empresasConfig } from '$lib/config/empresas';
import { PUBLIC_PAGUI_API_URL, PUBLIC_PAGUI_API_KEY } from '$env/static/public';

async function fetchFromBackend<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${PUBLIC_PAGUI_API_URL}${endpoint}`, {
      headers: { 'x-api-key': PUBLIC_PAGUI_API_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch {
    return null;
  }
}

export async function load() {
  // Intentar obtener empresas desde el backend
  let empresasDisponibles: any[] = [];

  const backendEmpresas = await fetchFromBackend<any[]>('/collections/companies');
  
  if (backendEmpresas && backendEmpresas.length > 0) {
    empresasDisponibles = backendEmpresas.map((emp: any) => ({
      id: emp.slug,
      nombre: emp.name,
      logo: emp.logo_url || '🏢',
      descripcion: emp.name,
      color: emp.colors?.primary || 'rgb(var(--primary))',
      gradiente: emp.colors?.gradient || 'var(--gradient-primary)',
      categoria: emp.config?.category || 'Servicios',
      ubicacion: emp.config?.location || 'Bolivia',
    }));
  } else {
    // Fallback: usar configuración local
    empresasDisponibles = Object.values(empresasConfig)
      .filter(empresa => empresa.activa)
      .map(empresa => ({
        id: empresa.slug,
        nombre: empresa.nombre,
        logo: empresa.logo,
        descripcion: empresa.descripcion,
        color: empresa.color,
        gradiente: empresa.gradiente,
        categoria: 'Servicios',
        ubicacion: 'Bolivia',
      }));
  }

  return {
    empresas: empresasDisponibles
  };
}
