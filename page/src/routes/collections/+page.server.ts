import { empresasConfig } from '$lib/config/empresas';

export async function load() {
	const empresasDisponibles = Object.values(empresasConfig)
		.filter((empresa) => empresa.activa)
		.map((empresa) => ({
			id: empresa.slug,
			nombre: empresa.nombre,
			logo: empresa.logo,
			descripcion: empresa.descripcion,
			color: empresa.color,
			gradiente: empresa.gradiente,
			categoria: 'Servicios',
			ubicacion: 'Bolivia'
		}));

	return {
		empresas: empresasDisponibles
	};
}
