// Ejemplo de uso del servicio consolidado de EMPSAAT

import { EmpsaatService } from '$lib/services/EmpsaatService';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Ejemplo de endpoint para obtener deudas de un abonado
 */
export const GET: RequestHandler = async ({ url }) => {
  // Obtener parámetros
  const abonado = parseInt(url.searchParams.get('abonado') || '0');
  const apiKey = url.headers.get('api-key') || '';

  if (isNaN(abonado) || !apiKey) {
    return json({
      success: false,
      error: 'Parámetros inválidos',
      codigo: 'PARAMETROS_INVALIDOS'
    }, { status: 400 });
  }

  // Obtener deudas del abonado a través del servicio consolidado
  const response = await EmpsaatService.obtenerDeudas(abonado, apiKey);

  // Retornar según el resultado
  if (response.success) {
    return json(response, { status: 200 });
  } else {
    return json(response, { status: 400 });
  }
};

/**
 * Ejemplo de endpoint para procesar pagos
 */
export const POST: RequestHandler = async ({ request }) => {
  // Obtener parámetros
  const apiKey = request.headers.get('api-key') || '';
  const data = await request.json();
  
  // Validar datos básicos
  if (!apiKey || !data || !data.abonado) {
    return json({
      success: false,
      error: 'Parámetros inválidos',
      codigo: 'PARAMETROS_INVALIDOS'
    }, { status: 400 });
  }

  const abonado = parseInt(data.abonado);

  // Determinar tipo de pago según los datos
  if (data.idServicios && Array.isArray(data.idServicios)) {
    // Procesar pago de servicios
    const response = await EmpsaatService.procesarPagoServicios(
      abonado,
      {
        total: parseFloat(data.total || 0),
        usuario: data.usuario || '',
        nit: data.nit || '',
        idServicios: data.idServicios
      },
      apiKey
    );

    // Retornar según el resultado
    if (response.success) {
      return json(response, { status: 200 });
    } else {
      return json(response, { status: 400 });
    }
  } 
  else if (data.cufs && Array.isArray(data.cufs)) {
    // Procesar pago de facturas de agua
    const cufs = data.cufs.map((cuf: string) => ({ cuf }));
    
    const response = await EmpsaatService.procesarPagoAgua(
      abonado,
      cufs,
      apiKey
    );

    // Retornar según el resultado
    if (response.success) {
      return json(response, { status: 200 });
    } else {
      return json(response, { status: 400 });
    }
  }
  else {
    return json({
      success: false,
      error: 'Tipo de pago no especificado correctamente',
      codigo: 'TIPO_PAGO_INVALIDO'
    }, { status: 400 });
  }
};

/**
 * Ejemplo para obtener lista de abonados
 */
export const actions = {
  buscarAbonados: async ({ request }) => {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey')?.toString() || '';
    const limit = parseInt(formData.get('limit')?.toString() || '10');
    const search = formData.get('search')?.toString() || '';
    
    const params = {
      limit: limit > 0 ? limit : 10,
      search: search || undefined
    };
    
    const response = await EmpsaatService.obtenerAbonados(params, apiKey);
    
    return response;
  }
};
