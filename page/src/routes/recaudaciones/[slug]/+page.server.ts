import { getEmpresaConfig, getConfiguracionPagui } from '$lib/config/empresas';
import { validarApiKeyEmpresa, verificarPermisoEmpresa, validarParametrosQR } from '$lib/utils/empresaUtils';
import { EmpsaatService } from '$lib/services/EmpsaatService';
import { PaguiAPI } from '$lib/services/PaguiAPI';
import { fail, error } from '@sveltejs/kit';
import type { 
  QRGenerationAPIResponse, 
  QRStatusAPIResponse, 
  QRCancellationAPIResponse,
  QRPaymentsAPIResponse,
  ServerResponse
} from '$lib/types/api';
import type { 
  DeudaAguaSchema, 
  DeudaServicioSchema, 
  AbonadoSchema,
  DeudasResponse
} from '$lib/types/empsaat';


export const load = async ({ params, url }) => {
  const { slug } = params;
  const abonado = parseInt(url.searchParams.get('abonado') || '0');
  
  if (!slug) {
    throw error(404, {
      message: 'Empresa no proporcionada'
    });
  }

  // Solo obtener datos públicos de la empresa para la interfaz
  const empresa = getEmpresaConfig(slug);
  
  if (!empresa) {
    throw error(404, {
      message: `La empresa ${slug} no existe o no está configurada en el sistema`
    });
  }

  return {
    empresa: {
      id: empresa.id,
      slug: empresa.slug,
      nombre: empresa.nombre,
      logo: empresa.logo,
      descripcion: empresa.descripcion,
      color: empresa.color,
      gradiente: empresa.gradiente,
      instrucciones: empresa.instrucciones,
      webUrl: empresa.webUrl,
    },
    // Solo incluir abonado si se pasó por URL
    ...(abonado && { abonado }),
    slug
  };
};

export const actions = {
  // Acción para buscar deudas por criterio
  buscarDeudas: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const keyword = formData.get('keyword')?.toString() || '';
      const type = formData.get('type')?.toString() || 'abonado';

      // Validar parámetros
      if (!keyword || keyword.trim().length === 0) {
        return fail(400, {
          success: false,
          error: 'Palabra clave de búsqueda requerida'
        });
      }

      if (!['nombre', 'documento', 'abonado'].includes(type)) {
        return fail(400, {
          success: false,
          error: 'Tipo de búsqueda inválido'
        });
      }

      // Si es EMPSAAT, usamos el servicio real
      if (slug === 'empsaat') {
        // La API key se obtiene del servidor, nunca se expone al cliente
        const apiKey = empresa.apiKey;
        
        // Buscar deudas por criterio a través del servicio
        const response = await EmpsaatService.buscarDeudasPorCriterio(keyword.trim(), type as 'nombre' | 'documento' | 'abonado', apiKey);
        console.log('response', JSON.stringify(response, null, 2));
        
        if (!response.success) {
          return fail(400, {
            success: false,
            error: response.error || 'Error al buscar deudas',
            codigo: response.codigo
          });
        }
        
        return {
          success: true,
          data: response.data,
          mensaje: `Deudas encontradas correctamente`
        };
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Integración para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error buscando deudas:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },
  
  // Acción para procesar pago de facturas de agua
  pagarFacturasAgua: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const abonado = parseInt(formData.get('abonado')?.toString() || '0');
      const facturasStr = formData.get('facturas')?.toString() || '';
      
      if (!abonado || isNaN(abonado)) {
        return fail(400, {
          success: false,
          error: 'Número de abonado inválido'
        });
      }
      
      if (!facturasStr) {
        return fail(400, {
          success: false,
          error: 'No se especificaron facturas a pagar'
        });
      }
      
      let facturas: {cuf: string}[] = [];
      try {
        facturas = JSON.parse(facturasStr);
      } catch (e) {
        return fail(400, {
          success: false,
          error: 'Formato de facturas inválido'
        });
      }
      
      // Si es EMPSAAT, usamos el servicio real
      if (slug === 'empsaat') {
        // La API key se obtiene del servidor, nunca se expone al cliente
        const apiKey = empresa.apiKey;
        
        // Procesar pago a través del servicio
        const response = await EmpsaatService.procesarPagoAgua(abonado, facturas, apiKey);
        
        if (!response.success) {
          return fail(400, {
            success: false,
            error: response.error || 'Error al procesar pago',
            codigo: response.codigo
          });
        }
        
        return {
          success: true,
          data: response.data,
          mensaje: 'Pago procesado correctamente'
        };
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Integración para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error procesando pago de agua:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },
  
  // Acción para procesar pago de servicios
  pagarServicios: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const abonado = parseInt(formData.get('abonado')?.toString() || '0');
      const total = parseFloat(formData.get('total')?.toString() || '0');
      const nit = formData.get('nit')?.toString() || '';
      const usuario = formData.get('usuario')?.toString() || '';
      const serviciosStr = formData.get('servicios')?.toString() || '';
      
      if (!abonado || isNaN(abonado)) {
        return fail(400, {
          success: false,
          error: 'Número de abonado inválido'
        });
      }
      
      if (!total || isNaN(total) || total <= 0) {
        return fail(400, {
          success: false,
          error: 'Total inválido'
        });
      }
      
      if (!nit) {
        return fail(400, {
          success: false,
          error: 'NIT requerido'
        });
      }
      
      if (!serviciosStr) {
        return fail(400, {
          success: false,
          error: 'No se especificaron servicios a pagar'
        });
      }
      
      let idServicios: number[] = [];
      try {
        idServicios = JSON.parse(serviciosStr);
      } catch (e) {
        return fail(400, {
          success: false,
          error: 'Formato de servicios inválido'
        });
      }
      
      // Si es EMPSAAT, usamos el servicio real
      if (slug === 'empsaat') {
        // La API key se obtiene del servidor, nunca se expone al cliente
        const apiKey = empresa.apiKey;
        
        const datos = {
          total,
          usuario,
          nit,
          idServicios
        };
        
        // Procesar pago a través del servicio
        const response = await EmpsaatService.procesarPagoServicios(abonado, datos, apiKey);
        
        if (!response.success) {
          return fail(400, {
            success: false,
            error: response.error || 'Error al procesar pago de servicios',
            codigo: response.codigo
          });
        }
        
        return {
          success: true,
          data: response.data,
          mensaje: 'Pago de servicios procesado correctamente'
        };
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Integración para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error procesando pago de servicios:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },
  
  // Acción para obtener información de un abonado
  obtenerAbonado: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const abonado = parseInt(formData.get('abonado')?.toString() || '0');
      
      if (!abonado || isNaN(abonado)) {
        return fail(400, {
          success: false,
          error: 'Número de abonado inválido'
        });
      }
      
      // Si es EMPSAAT, usamos el servicio real
      if (slug === 'empsaat') {
        // La API key se obtiene del servidor, nunca se expone al cliente
        const apiKey = empresa.apiKey;
        
        // Consultar abonado a través del servicio
        const response = await EmpsaatService.obtenerAbonadoPorId(abonado, apiKey);
        
        if (!response.success) {
          return fail(400, {
            success: false,
            error: response.error || 'Error al consultar abonado',
            codigo: response.codigo
          });
        }
        
        return {
          success: true,
          abonado: response.data,
          mensaje: `Información obtenida para el abonado ${abonado}`
        };
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Integración para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error obteniendo abonado:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Acción para generar QR de pago
  generarQR: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const monto = parseFloat(formData.get('monto')?.toString() || '0');
      const descripcion = formData.get('descripcion')?.toString() || '';
      const transactionId = formData.get('transactionId')?.toString() || '';
      const numeroCuenta = formData.get('numeroCuenta')?.toString() || '';
      
      if (!monto || isNaN(monto) || monto <= 0) {
        return fail(400, {
          success: false,
          error: 'Monto inválido'
        });
      }
      
      if (!descripcion) {
        return fail(400, {
          success: false,
          error: 'Descripción requerida'
        });
      }
      
      if (!transactionId) {
        return fail(400, {
          success: false,
          error: 'ID de transacción requerido'
        });
      }
      
      // Para EMPSAAT, usar la API real de QR
      if (slug === 'empsaat') {
        try {
          // Obtener configuración de Pagui
          const paguiConfig = getConfiguracionPagui(slug);
          if (!paguiConfig.apiKey || !paguiConfig.baseUrl) {
            return fail(500, {
              success: false,
              error: 'Configuración de Pagui no encontrada'
            });
          }

          // Crear instancia de PaguiAPI
          const paguiAPI = new PaguiAPI({
            apiKey: paguiConfig.apiKey,
            baseUrl: paguiConfig.baseUrl
          });

          // Calcular fecha de vencimiento (7 días desde ahora)
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);
          const dueDateISO = dueDate.toISOString();

          // Generar QR usando la clase PaguiAPI
          const qrData = await paguiAPI.generarQR({
            transactionId,
            amount: monto,
            description: descripcion,
            bankId: 1,
            dueDate: dueDateISO,
            singleUse: false,
            modifyAmount: false
          });
          // console.log('qrData', qrData);
          if (!qrData.success) {
            return fail(400, {
              success: false,
              error: qrData.message || 'Error al generar QR',
              codigo: qrData.codigo
            });
          }
          
          return {
            success: true,
            data: qrData.data,
            mensaje: 'QR generado correctamente'
          };
        } catch (apiError) {
          console.error('Error llamando API de QR:', apiError);
          return fail(500, {
            success: false,
            error: `Error al generar QR: ${apiError instanceof Error ? apiError.message : 'Error desconocido'}`
          });
        }
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Generación de QR para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error generando QR:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Acción para verificar estado del QR
  verificarEstadoQR: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const qrId = formData.get('qrId')?.toString() || '';
      
      if (!qrId) {
        return fail(400, {
          success: false,
          error: 'ID de QR requerido'
        });
      }
      
      // Para EMPSAAT, usar la API real para verificar estado
      if (slug === 'empsaat') {
        try {
          // Obtener configuración de Pagui
          const paguiConfig = getConfiguracionPagui(slug);
          if (!paguiConfig.apiKey || !paguiConfig.baseUrl) {
            return fail(500, {
              success: false,
              error: 'Configuración de Pagui no encontrada'
            });
          }

          // Crear instancia de PaguiAPI
          const paguiAPI = new PaguiAPI({
            apiKey: paguiConfig.apiKey,
            baseUrl: paguiConfig.baseUrl
          });

          // Verificar estado del QR usando la clase PaguiAPI
          const statusData = await paguiAPI.verificarEstadoQR(qrId);
          
          if (!statusData.success) {
            return fail(400, {
              success: false,
              error: statusData.message || 'Error al verificar estado del QR',
              codigo: statusData.codigo
            });
          }
          
          return {
            success: true,
            data: statusData.data,
            mensaje: 'Estado del QR obtenido correctamente'
          };
        } catch (apiError) {
          console.error('Error verificando estado QR:', apiError);
          return fail(500, {
            success: false,
            error: `Error al verificar estado del QR: ${apiError instanceof Error ? apiError.message : 'Error desconocido'}`
          });
        }
      }
      
      return fail(501, {
        success: false,
        error: `Verificación de QR para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error verificando estado QR:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Acción para cancelar QR
  cancelarQR: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const qrId = formData.get('qrId')?.toString() || '';
      
      if (!qrId) {
        return fail(400, {
          success: false,
          error: 'ID de QR requerido'
        });
      }
      
      // Para EMPSAAT, usar la API real para cancelar QR
      if (slug === 'empsaat') {
        try {
          // Obtener configuración de Pagui
          const paguiConfig = getConfiguracionPagui(slug);
          if (!paguiConfig.apiKey || !paguiConfig.baseUrl) {
            return fail(500, {
              success: false,
              error: 'Configuración de Pagui no encontrada'
            });
          }

          // Crear instancia de PaguiAPI
          const paguiAPI = new PaguiAPI({
            apiKey: paguiConfig.apiKey,
            baseUrl: paguiConfig.baseUrl
          });

          // Cancelar QR usando la clase PaguiAPI
          const cancelData = await paguiAPI.cancelarQR(qrId);
          
          if (!cancelData.success) {
            return fail(400, {
              success: false,
              error: cancelData.message || 'Error al cancelar QR',
              codigo: cancelData.codigo
            });
          }
          
          return {
            success: true,
            data: cancelData.data,
            mensaje: 'QR cancelado correctamente'
          };
        } catch (apiError) {
          console.error('Error cancelando QR:', apiError);
          return fail(500, {
            success: false,
            error: `Error al cancelar QR: ${apiError instanceof Error ? apiError.message : 'Error desconocido'}`
          });
        }
      }
      
      return fail(501, {
        success: false,
        error: `Cancelación de QR para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error cancelando QR:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Acción para obtener pagos de un QR específico
  obtenerPagosQR: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return fail(400, { 
        success: false, 
        error: 'Empresa no proporcionada' 
      });
    }

    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return fail(404, {
        success: false,
        error: `La empresa ${slug} no existe o no está configurada`
      });
    }
    
    try {
      const formData = await request.formData();
      const qrId = formData.get('qrId')?.toString() || '';
      
      if (!qrId) {
        return fail(400, {
          success: false,
          error: 'ID de QR requerido'
        });
      }
      
      // Para EMPSAAT, usar la API real para obtener pagos
      if (slug === 'empsaat') {
        try {
          // Obtener configuración de Pagui
          const paguiConfig = getConfiguracionPagui(slug);
          if (!paguiConfig.apiKey || !paguiConfig.baseUrl) {
            return fail(500, {
              success: false,
              error: 'Configuración de Pagui no encontrada'
            });
          }

          // Crear instancia de PaguiAPI
          const paguiAPI = new PaguiAPI({
            apiKey: paguiConfig.apiKey,
            baseUrl: paguiConfig.baseUrl
          });

          // Obtener pagos del QR usando la clase PaguiAPI
          const paymentsData = await paguiAPI.obtenerPagosQR(qrId);
          
          if (!paymentsData.success) {
            return fail(400, {
              success: false,
              error: paymentsData.message || 'Error al obtener pagos del QR',
              codigo: paymentsData.codigo
            });
          }
          
          return {
            success: true,
            data: paymentsData.data,
            mensaje: 'Pagos del QR obtenidos correctamente'
          };
        } catch (apiError) {
          console.error('Error obteniendo pagos QR:', apiError);
          return fail(500, {
            success: false,
            error: `Error al obtener pagos del QR: ${apiError instanceof Error ? apiError.message : 'Error desconocido'}`
          });
        }
      }
      
      return fail(501, {
        success: false,
        error: `Obtención de pagos QR para ${empresa.nombre} no implementada aún`
      });
    } catch (error) {
      console.error('Error obteniendo pagos QR:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
};