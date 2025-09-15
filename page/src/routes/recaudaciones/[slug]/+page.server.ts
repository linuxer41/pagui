import { getEmpresaConfig } from '$lib/config/empresas';
import { EmpsaatService } from '$lib/services/EmpsaatService';
import { QRService } from '$lib/services/QRService';
import { PaymentNotificationService } from '$lib/services/PaymentNotificationService';
import { fail, error } from '@sveltejs/kit';

// Helper para simplificar respuestas de error
const errorResponse = (message: string, status = 400) => fail(status, { error: message });
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
      return errorResponse('Empresa no proporcionada');
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
    }
    
    try {
      const formData = await request.formData();
      const keyword = formData.get('keyword')?.toString() || '';
      const type = formData.get('type')?.toString() || 'abonado';

      // Validar parámetros
      if (!keyword || keyword.trim().length === 0) {
        return errorResponse('Palabra clave de búsqueda requerida');
      }

      if (!['nombre', 'documento', 'abonado'].includes(type)) {
        return errorResponse('Tipo de búsqueda inválido');
      }

      // Si es EMPSAAT, usamos el servicio real
      if (slug === 'empsaat') {
        // Crear instancia del servicio con la configuración de la empresa
        const empsaatService = new EmpsaatService(empresa);
        
        // Buscar deudas por criterio a través del servicio
        const response = await empsaatService.buscarDeudasPorCriterio(keyword.trim(), type as 'nombre' | 'documento' | 'abonado');
        
        if (!response.success) {
          return errorResponse(response.error || 'Error al buscar deudas');
        }
        
        return response;
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return errorResponse(`Integración para ${empresa.nombre} no implementada aún`, 501);
    } catch (error) {
      console.error('Error buscando deudas:', error);
      return errorResponse('Error interno del servidor', 500);
    }
  },

  // Acción para crear transacción EMPSAAT y generar QR
  crearTransaccionEmpsaat: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return errorResponse('Empresa no proporcionada');
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
    }
    
    try {
      const formData = await request.formData();
      const abonado = parseInt(formData.get('abonado')?.toString() || '0');
      const taxId = formData.get('taxId')?.toString() || '';
      const businessName = formData.get('businessName')?.toString() || '';
      const email = formData.get('email')?.toString() || '';
      const waterDebtsStr = formData.get('waterDebts')?.toString() || '';
      const serviceDebtsStr = formData.get('serviceDebts')?.toString() || '';
      
      // Validaciones básicas
      if (!abonado || isNaN(abonado)) {
        return fail(400, {
          success: false,
          error: 'Número de abonado inválido'
        });
      }
      
      if (!taxId) {
        return fail(400, {
          success: false,
          error: 'NIT/Tax ID requerido'
        });
      }
      
      if (!businessName) {
        return fail(400, {
          success: false,
          error: 'Nombre de empresa requerido'
        });
      }
      
      if (!email) {
        return fail(400, {
          success: false,
          error: 'Email requerido'
        });
      }
      
      // Parsear deudas
      let waterDebts: number[] = [];
      let serviceDebts: number[] = [];
      
      try {
        if (waterDebtsStr) {
          waterDebts = JSON.parse(waterDebtsStr);
        }
        if (serviceDebtsStr) {
          serviceDebts = JSON.parse(serviceDebtsStr);
        }
      } catch (parseError) {
        console.error('Error parseando deudas:', parseError);
        return fail(400, {
          success: false,
          error: 'Formato de deudas inválido'
        });
      }
      
      // Validar que se seleccionó al menos una deuda
      if (waterDebts.length === 0 && serviceDebts.length === 0) {
        return fail(400, {
          success: false,
          error: 'Debe seleccionar al menos una deuda para crear la transacción'
        });
      }
      
      // Solo para EMPSAAT
      if (slug === 'empsaat') {
        try {
          // Crear instancia del servicio con la configuración de la empresa
          const empsaatService = new EmpsaatService(empresa);
          
          // Paso 1: Crear transacción en EMPSAAT
          const transaccionData = {
            taxId: taxId,
            businessName: businessName,
            email: email,
            waterDebts: waterDebts.length > 0 ? waterDebts : undefined,
            serviceDebts: serviceDebts.length > 0 ? serviceDebts : undefined
          };
          
          console.log('Creando transacción EMPSAAT con datos:', transaccionData);
          
          const transaccionResponse = await empsaatService.crearTransaccion(abonado, transaccionData);
          // console.log('Transacción creada exitosamente:', transaccionResponse.status);
          if (!transaccionResponse.success) {
            return fail(400, {
              success: false,
              error: transaccionResponse.error || 'Error al crear transacción en EMPSAAT'
            });
          }
          console.log('Transacción creada exitosamente:', transaccionResponse);
          
          const transaccion = transaccionResponse.data;
          console.log('Transacción creada exitosamente:', transaccion);
          
          // Paso 2: Generar QR con los datos de la transacción
          const qrService = new QRService(empresa);
          
          // Crear descripción basada en la transacción
          let descripcion = `Pago EMPSAAT - Abonado ${abonado}`;
          if (transaccion?.metadata?.waterDebts?.length && transaccion?.metadata?.serviceDebts?.length) {
            descripcion = `Pago EMPSAAT - ${transaccion.metadata.waterDebts.length} facturas agua + ${transaccion.metadata.serviceDebts.length} servicios`;
          } else if (transaccion?.metadata?.waterDebts?.length) {
            descripcion = `Pago EMPSAAT - ${transaccion.metadata.waterDebts.length} facturas de agua`;
          } else if (transaccion?.metadata?.serviceDebts?.length) {
            descripcion = `Pago EMPSAAT - ${transaccion.metadata.serviceDebts.length} servicios`;
          }
          
          // Debug: Log de datos que se envían para generar QR
          const qrRequestData = {
            transactionId: transaccion?.transactionId || '',
            amount: transaccion?.amount || 0,
            description: descripcion
          };
          
          console.log('=== DEBUG QR GENERATION ===');
          console.log('TransaccionResponse completa:', transaccionResponse);
          console.log('Datos de transacción extraídos:', {
            transactionId: transaccion?.transactionId,
            amount: transaccion?.amount,
            subscriberNumber: transaccion?.subscriberNumber,
            status: transaccion?.status,
            metadata: transaccion?.metadata
          });
          console.log('Datos que se envían para generar QR:', qrRequestData);
          console.log('===========================');
          
          const qrData = await qrService.generarQR(qrRequestData);
          
          // Debug: Log de respuesta del QR
          console.log('=== DEBUG QR RESPONSE ===');
          console.log('QR generado exitosamente:', qrData.success);
          if (qrData.success) {
            console.log('Datos del QR:', {
              qrId: qrData.data?.qrId,
              amount: qrData.data?.amount,
              description: qrData.data?.description,
              qrImageLength: qrData.data?.qrImage?.length || 0,
              dueDate: qrData.data?.dueDate
            });
          } else {
            console.log('Error generando QR:', (qrData as any).error);
          }
          console.log('=========================');
          
          // Iniciar monitoreo de pago después de generar QR exitosamente
          try {
            const paymentService = PaymentNotificationService.getInstance();
            await paymentService.startPaymentMonitoring(
              qrData.data.qrId,
              transaccion?.transactionId || '',
              abonado.toString(),
              waterDebts.map(id => ({ factura: id, abonado: abonado })),
              serviceDebts.map(id => ({ noSolicitud: id, abonado: abonado })),
              transaccion?.amount || 0,
              slug
            );
            console.log(`Monitoreo de pago iniciado para QR: ${qrData.data.qrId}, Transacción: ${transaccion?.transactionId}`);
          } catch (monitoringError) {
            console.error('Error iniciando monitoreo de pago:', monitoringError);
            // No fallar la generación del QR si el monitoreo falla
          }
          
          return {
            success: true,
            data: {
              transaccion: transaccion,
              qr: qrData.data
            },
            mensaje: 'Transacción creada y QR generado correctamente'
          };
          
        } catch (apiError) {
          console.error('Error en flujo de transacción EMPSAAT:', apiError);
          
          // Mejorar el manejo de errores para mostrar mensajes específicos
          let errorMessage = 'Error al procesar transacción';
          if (apiError instanceof Error) {
            if (apiError.message.includes('No se puede crear la transacción')) {
              errorMessage = apiError.message.replace('Error: 400 ', '');
            } else if (apiError.message.includes('Error:')) {
              errorMessage = apiError.message.replace('Error: ', '');
            } else {
              errorMessage = apiError.message;
            }
          }
          
          return fail(400, {
            success: false,
            error: errorMessage
          });
        }
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Flujo de transacciones para ${empresa.nombre} no implementado aún`
      });
    } catch (error) {
      console.error('Error en crearTransaccionEmpsaat:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Acción para generar QR de pago (mantenida para compatibilidad)
  generarQR: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return errorResponse('Empresa no proporcionada');
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
    }
    
    try {
      const formData = await request.formData();
      const monto = parseFloat(formData.get('monto')?.toString() || '0');
      const descripcion = formData.get('descripcion')?.toString() || '';
      const transactionId = formData.get('transactionId')?.toString() || '';
      const numeroCuenta = formData.get('numeroCuenta')?.toString() || '';
      const deudasAguaStr = formData.get('deudasAgua')?.toString() || '';
      const deudasServiciosStr = formData.get('deudasServicios')?.toString() || '';
      
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
      
      if (!numeroCuenta) {
        return fail(400, {
          success: false,
          error: 'Número de cuenta requerido'
        });
      }
      
      // Para EMPSAAT, usar la API real de QR
      if (slug === 'empsaat') {
        try {
          // Validar deudas con la API de EMPSAAT por seguridad
          const apiKey = empresa.apiKey;
          if (!apiKey) {
            return fail(500, {
              success: false,
              error: 'API Key de EMPSAAT no configurada'
            });
          }
          
          // Parsear deudas enviadas desde el frontend
          let deudasAgua = [];
          let deudasServicios = [];
          
          try {
            if (deudasAguaStr) {
              deudasAgua = JSON.parse(deudasAguaStr);
            }
            if (deudasServiciosStr) {
              deudasServicios = JSON.parse(deudasServiciosStr);
            }
          } catch (parseError) {
            console.error('Error parseando deudas:', parseError);
            return fail(400, {
              success: false,
              error: 'Formato de deudas inválido'
            });
          }
          
          // Crear instancia del servicio con la configuración de la empresa
          const empsaatService = new EmpsaatService(empresa);
          
          // Recalcular totales con la API de EMPSAAT para validación
          const response = await empsaatService.buscarDeudasPorCriterio(numeroCuenta, 'abonado');
          
          if (!response.success) {
            return fail(400, {
              success: false,
              error: response.error || 'Error al validar deudas con EMPSAAT',
              codigo: response.codigo
            });
          }
          
          // Validar que las deudas enviadas coincidan con las de la API
          const apiDeudas = response.data?.deudas || [];
          const abonadoApi = apiDeudas.find((a: any) => a.abonado.abonado.toString() === numeroCuenta);
          
          if (!abonadoApi) {
            return fail(400, {
              success: false,
              error: 'Abonado no encontrado en EMPSAAT'
            });
          }
          
          // Validar deudas de agua
          let totalAguaValidado = 0;
          for (const deudaAgua of deudasAgua) {
            const deudaApi = abonadoApi.deudasAgua.find((d: any) => d.factura === deudaAgua.factura);
            if (!deudaApi) {
              return fail(400, {
                success: false,
                error: `Factura de agua ${deudaAgua.factura} no encontrada en EMPSAAT`
              });
            }
            totalAguaValidado += deudaApi.importeFactura;
          }
          
          // Validar deudas de servicios
          let totalServiciosValidado = 0;
          for (const deudaServicio of deudasServicios) {
            const deudaApi = abonadoApi.deudasServicios.find((d: any) => 
              (d.noSolicitud === deudaServicio.noSolicitud) || 
              (d.idServicio === deudaServicio.noSolicitud) ||
              (d.id === deudaServicio.noSolicitud)
            );
            if (!deudaApi) {
              return fail(400, {
                success: false,
                error: `Servicio ${deudaServicio.noSolicitud} no encontrado en EMPSAAT`
              });
            }
            totalServiciosValidado += deudaApi.costo || 0;
          }
          
          // Validar que el total coincida
          const totalValidado = totalAguaValidado + totalServiciosValidado;
          if (Math.abs(totalValidado - monto) > 0.01) {
            return fail(400, {
              success: false,
              error: `El monto enviado (${monto}) no coincide con el calculado por EMPSAAT (${totalValidado})`
            });
          }
          
          // Crear instancia del servicio de QR con la configuración de la empresa
          const qrService = new QRService(empresa);
          
          // Generar QR de forma simplificada
          const qrData = await qrService.generarQR({
            transactionId,
            amount: monto,
            description: descripcion
          });
          
          // Iniciar monitoreo de pago después de generar QR exitosamente
          try {
            const paymentService = PaymentNotificationService.getInstance();
            await paymentService.startPaymentMonitoring(
              qrData.data.qrId,
              transactionId,
              numeroCuenta,
              deudasAgua,
              deudasServicios,
              monto,
              slug
            );
            console.log(`Monitoreo de pago iniciado para QR: ${qrData.data.qrId}`);
          } catch (monitoringError) {
            console.error('Error iniciando monitoreo de pago:', monitoringError);
            // No fallar la generación del QR si el monitoreo falla
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
      return errorResponse('Empresa no proporcionada');
    }

    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
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
          // Crear instancia del servicio de QR con la configuración de la empresa
          const qrService = new QRService(empresa);
          
          // Verificar estado del QR de forma simplificada
          const statusData = await qrService.verificarEstadoQR(qrId);
          
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
      return errorResponse('Empresa no proporcionada');
    }

    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
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
          // Crear instancia del servicio de QR con la configuración de la empresa
          const qrService = new QRService(empresa);
          
          // Cancelar QR de forma simplificada
          const cancelData = await qrService.cancelarQR(qrId);
          
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

  // Acción para completar transacción EMPSAAT cuando se recibe pago
  completarTransaccionEmpsaat: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return errorResponse('Empresa no proporcionada');
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
    }
    
    try {
      const formData = await request.formData();
      const transactionId = formData.get('transactionId')?.toString() || '';
      const paymentMethod = formData.get('paymentMethod')?.toString() || '';
      const amountPaid = parseFloat(formData.get('amountPaid')?.toString() || '0');
      
      // Validaciones básicas
      if (!transactionId) {
        return fail(400, {
          success: false,
          error: 'ID de transacción requerido'
        });
      }
      
      if (!paymentMethod) {
        return fail(400, {
          success: false,
          error: 'Método de pago requerido'
        });
      }
      
      if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0) {
        return fail(400, {
          success: false,
          error: 'Monto pagado inválido'
        });
      }
      
      // Validar método de pago
      const metodosValidos = ['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque', 'qr'];
      if (!metodosValidos.includes(paymentMethod)) {
        return fail(400, {
          success: false,
          error: 'Método de pago inválido'
        });
      }
      
      // Solo para EMPSAAT
      if (slug === 'empsaat') {
        try {
          // Crear instancia del servicio con la configuración de la empresa
          const empsaatService = new EmpsaatService(empresa);
          
          // Completar transacción en EMPSAAT
          const pagoData = {
            transactionId: transactionId,
            paymentMethod: paymentMethod as any,
            amountPaid: amountPaid
          };
          
          console.log('Completando transacción EMPSAAT con datos:', pagoData);
          
          const pagoResponse = await empsaatService.completarTransaccion(pagoData);
          
          if (!pagoResponse.success) {
            return fail(400, {
              success: false,
              error: pagoResponse.error || 'Error al completar transacción en EMPSAAT'
            });
          }
          
          const transaccionCompletada = pagoResponse.data;
          console.log('Transacción completada exitosamente:', transaccionCompletada);
          
          return {
            success: true,
            data: transaccionCompletada,
            mensaje: 'Transacción completada correctamente'
          };
          
        } catch (apiError) {
          console.error('Error completando transacción EMPSAAT:', apiError);
          return fail(500, {
            success: false,
            error: `Error al completar transacción: ${apiError instanceof Error ? apiError.message : 'Error desconocido'}`
          });
        }
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Completar transacciones para ${empresa.nombre} no implementado aún`
      });
    } catch (error) {
      console.error('Error en completarTransaccionEmpsaat:', error);
      return fail(500, {
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Acción para obtener historial de transacciones de un abonado
  obtenerHistorialTransacciones: async ({ request, params }) => {
    const { slug } = params;
    
    if (!slug) {
      return errorResponse('Empresa no proporcionada');
    }

    // Verificar que la empresa exista y esté configurada
    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
    }
    
    try {
      const formData = await request.formData();
      const abonado = parseInt(formData.get('abonado')?.toString() || '0');
      
      // Validaciones básicas
      if (!abonado || isNaN(abonado)) {
        return fail(400, {
          success: false,
          error: 'Número de abonado inválido'
        });
      }
      
      // Solo para EMPSAAT
      if (slug === 'empsaat') {
        try {
          // Crear instancia del servicio con la configuración de la empresa
          const empsaatService = new EmpsaatService(empresa);
          
          // Obtener historial de transacciones
          const historialResponse = await empsaatService.obtenerHistorialTransacciones(abonado);
          
          if (!historialResponse.success) {
            console.warn('No se pudo obtener historial de transacciones:', historialResponse.error);
            // En lugar de fallar, devolver array vacío para que la funcionalidad principal no se vea afectada
            return {
              success: true,
              data: [],
              mensaje: 'Historial de transacciones no disponible'
            };
          }
          
          const historial = historialResponse.data;
          console.log('Historial de transacciones obtenido:', historial);
          
          return {
            success: true,
            data: historial,
            mensaje: 'Historial de transacciones obtenido correctamente'
          };
          
        } catch (apiError) {
          console.error('Error obteniendo historial de transacciones:', apiError);
          // En lugar de fallar, devolver array vacío para que la funcionalidad principal no se vea afectada
          return {
            success: true,
            data: [],
            mensaje: 'Historial de transacciones no disponible temporalmente'
          };
        }
      }
      
      // Para otras empresas, devolvemos un mensaje de que no está implementado aún
      return fail(501, {
        success: false,
        error: `Historial de transacciones para ${empresa.nombre} no implementado aún`
      });
    } catch (error) {
      console.error('Error en obtenerHistorialTransacciones:', error);
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
      return errorResponse('Empresa no proporcionada');
    }

    const empresa = getEmpresaConfig(slug);
    if (!empresa) {
      return errorResponse(`La empresa ${slug} no existe o no está configurada`, 404);
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
          // Crear instancia del servicio de QR con la configuración de la empresa
          const qrService = new QRService(empresa);
          
          // Obtener pagos del QR de forma simplificada
          const paymentsData = await qrService.obtenerPagosQR(qrId);
          
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