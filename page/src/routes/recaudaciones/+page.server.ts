import { empresasConfig } from '$lib/config/empresas';

export async function load() {
  // Obtener todas las empresas activas desde la configuración
  const empresasDisponibles = Object.values(empresasConfig)
    .filter(empresa => empresa.activa)
    .map(empresa => ({
      id: empresa.slug,
      nombre: empresa.nombre,
      logo: empresa.logo,
      descripcion: empresa.descripcion,
      color: empresa.color,
      gradiente: empresa.gradiente,
      categoria: 'Servicios', // Categoría por defecto
      ubicacion: 'Bolivia' // Ubicación por defecto
    }));

  return {
    empresas: empresasDisponibles
  };
}
