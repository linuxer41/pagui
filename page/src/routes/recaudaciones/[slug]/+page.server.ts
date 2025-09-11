import { getEmpresaConfig } from '$lib/config/empresas';
import { validarApiKeyEmpresa, verificarPermisoEmpresa, validarParametrosQR } from '$lib/utils/empresaUtils';
import { EmpsaatService } from '$lib/services/EmpsaatService';
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
  // Acción para buscar deudas de un abonado
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
        
        // Consultar deudas a través del servicio
        const response = await EmpsaatService.obtenerDeudas(abonado, apiKey);
        console.log('response', JSON.stringify(response, null, 2));
        
        if (!response.success) {
          return fail(400, {
            success: false,
            error: response.error || 'Error al consultar deudas',
            codigo: response.codigo
          });
        }
        
        return {
          success: true,
          data: response.data,
          mensaje: `Deudas obtenidas correctamente`
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
          // Calcular fecha de vencimiento (7 días desde ahora)
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);
          const dueDateISO = dueDate.toISOString();

          // Llamar a la API real de QR según documentación
          const qrApiResponse = await fetch('https://pagui-api.iathings.com/qr/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${empresa.apiKey}` // Usar API key de la empresa
            },
            body: JSON.stringify({
              transactionId: transactionId,
              amount: monto,
              description: descripcion,
              bankId: 1, // Default según documentación
              dueDate: dueDateISO,
              singleUse: false, // Default según documentación
              modifyAmount: false // Default según documentación
            })
          });

          if (!qrApiResponse.ok) {
            const errorData = await qrApiResponse.json().catch(() => ({}));
            throw new Error(`API QR error: ${qrApiResponse.status} - ${errorData.message || 'Error desconocido'}`);
          }

          const qrData = await qrApiResponse.json();
          
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
          // Llamar a la API real para verificar estado del QR según documentación
          const statusApiResponse = await fetch(`https://pagui-api.iathings.com/qr/${qrId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${empresa.apiKey}` // Usar API key de la empresa
            }
          });

          if (!statusApiResponse.ok) {
            const errorData = await statusApiResponse.json().catch(() => ({}));
            throw new Error(`API QR Status error: ${statusApiResponse.status} - ${errorData.message || 'Error desconocido'}`);
          }

          const statusData = await statusApiResponse.json();
          
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
          // Llamar a la API real para cancelar el QR según documentación
          const cancelApiResponse = await fetch(`https://pagui-api.iathings.com/qr/${qrId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${empresa.apiKey}` // Usar API key de la empresa
            }
          });

          if (!cancelApiResponse.ok) {
            const errorData = await cancelApiResponse.json().catch(() => ({}));
            throw new Error(`API QR Cancel error: ${cancelApiResponse.status} - ${errorData.message || 'Error desconocido'}`);
          }

          const cancelData = await cancelApiResponse.json();
          
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
          // Llamar a la API real para obtener pagos del QR según documentación
          const paymentsApiResponse = await fetch(`https://pagui-api.iathings.com/qr/${qrId}/payments`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${empresa.apiKey}` // Usar API key de la empresa
            }
          });

          if (!paymentsApiResponse.ok) {
            const errorData = await paymentsApiResponse.json().catch(() => ({}));
            throw new Error(`API QR Payments error: ${paymentsApiResponse.status} - ${errorData.message || 'Error desconocido'}`);
          }

          const paymentsData = await paymentsApiResponse.json();
          
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