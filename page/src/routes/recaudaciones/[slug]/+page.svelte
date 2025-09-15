<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { applyAction, deserialize } from '$app/forms';
  import type { ActionResult } from '@sveltejs/kit';
  import type { 
    QRGenerationData, 
    QRStatusData, 
    QRCancellationData,
    QRGenerationAPIResponse,
    QRStatusAPIResponse,
    QRCancellationAPIResponse
  } from '$lib/types/api';
  import { onDestroy, onMount } from 'svelte';
  import { ShieldIcon, LockIcon, CheckCircleIcon, SearchIcon } from 'svelte-feather-icons';
  import '../../../lib/theme.css';
  
  // Importar los componentes
  import FormularioBusqueda from '$lib/components/recaudaciones/FormularioBusqueda.svelte';
  import ClienteInfo from '$lib/components/recaudaciones/ClienteInfo.svelte';
  import ListaDeudas from '$lib/components/recaudaciones/ListaDeudas.svelte';
  import QRDisplay from '$lib/components/recaudaciones/QRDisplay.svelte';
  import DebugMessage from '$lib/components/recaudaciones/DebugMessage.svelte';
  import EmpsaatDeudasDisplay from '$lib/components/recaudaciones/EmpsaatDeudasDisplay.svelte';
  
  // Definir tipos para los datos
  interface Deuda {
    id?: string | number;
    cuf?: string;
    monto: number;
    descripcion: string;
    fecha: string | Date;
    estado: string;
    numeroCuenta?: string | number;
    volumenConsumo?: number;
    tipo?: 'agua' | 'servicio';
    nombreCliente?: string;
    idServicio?: number;
  }

  interface Cliente {
    nombre: string;
    numeroCuenta: string;
    nit?: string;
    [key: string]: any;
  }

  interface Empresa {
    id: string;
    slug: string;
    nombre: string;
    logo: string;
    descripcion: string;
    color: string;
    gradiente: string;
    instrucciones: string;
    webUrl: string;
    usaQR?: boolean;
    apiKey?: string;
  }

  interface PageData {
    empresa: Empresa;
    slug?: string;
    codigoCliente?: string;
    deudas?: Deuda[];
    cliente?: Cliente;
    tieneDeuda?: boolean;
  }
  
  export let data: PageData;
  
  let { empresa, slug, codigoCliente, cliente } = data;
  
  // Si la empresa no tiene propiedad usaQR, asumimos que sí lo usa
  empresa = { ...empresa, usaQR: empresa.usaQR !== undefined ? empresa.usaQR : true };
  let codigoClienteInput = '';
  let isLoading = false;
  let searchResult: any = null;
  let error: string | null = null;
  let qrGenerado: QRGenerationData | null = null;
  let qrStatus: QRStatusData | null = null;
  let pollingInterval: any = null;
  let isGeneratingQR = false; // Variable para controlar el estado de carga del botón de pagar
  let currentStep = 1; // Variable para controlar el paso actual del proceso
  
  // Estado para el tipo de búsqueda
  let tipoBusqueda: 'nombre' | 'documento' | 'abonado' = 'abonado';

  // Función para buscar cuenta usando el patrón correcto de SvelteKit
  async function buscarCuenta() {
    if (!codigoClienteInput.trim()) {
      error = 'Por favor ingresa tu código de cliente';
      return;
    }
    
    isLoading = true;
    error = null;
    searchResult = null;
    
    try {
      const formData = new FormData();
      formData.append('keyword', codigoClienteInput.trim());
      formData.append('type', tipoBusqueda);
      
      const response = await fetch(`?/buscarDeudas`, {
        method: 'POST',
        body: formData
      });

      const actionResult: ActionResult = deserialize(await response.text());
      console.log('result', actionResult);
      
      if (actionResult.type === 'success' && actionResult.data) {
        // Usar la respuesta tal como viene de la API
        searchResult = actionResult.data;
        
        // Debug: Log para verificar la estructura de datos
        console.log('Frontend - actionResult:', actionResult);
        console.log('Frontend - searchResult:', searchResult);
        
        // Ya no necesitamos crear cliente manualmente, viene en la respuesta
        // La información del cliente estará en searchResult.data.deudas[0].abonado
        
        // Limpiar el input después de una búsqueda exitosa
        codigoClienteInput = '';
      } else if (actionResult.type === 'failure') {
        error = actionResult.data?.error || 'Error al buscar deudas del cliente';
        if (actionResult.data?.codigo) {
          error += ` (${actionResult.data.codigo})`;
        }
      } else {
        error = 'Error inesperado al buscar deudas del cliente';
      }
      
      // Aplicar la acción del resultado
      if (actionResult) applyAction(actionResult);
      
    } catch (err) {
      console.error('Error en buscarCuenta:', err);
      error = 'Error de conexión. Intenta nuevamente.';
    } finally {
      isLoading = false;
    }
  }


  // Función para limpiar la información del cliente y volver al formulario de búsqueda
  function limpiarCliente() {
    cliente = undefined;
    searchResult = null;
    error = null;
    qrGenerado = null;
    qrStatus = null;
    codigoClienteInput = '';
    currentStep = 1; // Resetear al paso 1
    
    // Limpiar polling si está activo
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // Función para actualizar las deudas del abonado actual
  async function actualizarDeudas() {
    if (!searchResult?.data?.deudas || searchResult.data.deudas.length === 0) {
      return;
    }

    // Obtener el criterio de búsqueda actual
    const abonadoActual = searchResult.data.deudas[0]?.abonado;
    if (!abonadoActual) {
      return;
    }

    // Activar estado de carga sin resetear el searchResult
    isLoading = true;
    error = null;

    try {
      const formData = new FormData();
      formData.append('keyword', abonadoActual.abonado.toString());
      formData.append('type', 'abonado');
      
      const response = await fetch(`?/buscarDeudas`, {
        method: 'POST',
        body: formData
      });

      const actionResult: ActionResult = deserialize(await response.text());
      console.log('Actualización - result', actionResult);
      
      if (actionResult.type === 'success' && actionResult.data) {
        // Actualizar solo los datos sin resetear el estado
        searchResult = actionResult.data;
        console.log('Actualización - searchResult actualizado:', searchResult);
      } else if (actionResult.type === 'failure') {
        error = actionResult.data?.error || 'Error al actualizar deudas del cliente';
        if (actionResult.data?.codigo) {
          error += ` (${actionResult.data.codigo})`;
        }
      } else {
        error = 'Error inesperado al actualizar deudas del cliente';
      }
      
      // Aplicar la acción del resultado
      if (actionResult) applyAction(actionResult);
      
    } catch (err) {
      console.error('Error en actualizarDeudas:', err);
      error = 'Error de conexión. Intenta nuevamente.';
    } finally {
      isLoading = false;
    }
  }
  
  // Función para generar QR específica para EMPSAAT usando el nuevo flujo de transacciones
  async function generarQREmpsaat(deudas: any[], total: number, abonado: any) {
    console.log('generarQREmpsaat llamada con:', deudas, 'total:', total, 'abonado:', abonado);
    if (!deudas || deudas.length === 0) return;
    
    // Activar loader del botón
    isGeneratingQR = true;
    error = null;
    qrGenerado = null;
    
    let actionResult: ActionResult | undefined;
    
    try {
      if (empresa.usaQR) {
        const formData = new FormData();
        
        // Datos del abonado
        formData.append('abonado', abonado?.abonado?.toString() || '');
        
        // Datos de la empresa/cliente (usar datos del abonado o valores por defecto)
        formData.append('taxId', abonado?.nit?.toString() || '0');
        formData.append('businessName', abonado?.nombre || 'Cliente EMPSAAT');
        formData.append('email', 'cliente@empsaat.com'); // Email por defecto
        
        // Separar deudas por tipo y extraer IDs
        const deudasAgua = deudas.filter(d => d.tipo === 'agua').map(d => d.factura);
        const deudasServicios = deudas.filter(d => d.tipo === 'servicio').map(d => 
          d.noSolicitud || d.idServicio || d.id
        );
        
        formData.append('waterDebts', JSON.stringify(deudasAgua));
        formData.append('serviceDebts', JSON.stringify(deudasServicios));
        
        console.log('Enviando datos para crear transacción:', {
          abonado: abonado?.abonado,
          taxId: abonado?.nit?.toString() || '0',
          businessName: abonado?.nombre || 'Cliente EMPSAAT',
          waterDebts: deudasAgua,
          serviceDebts: deudasServicios
        });
        
        const response = await fetch(`?/crearTransaccionEmpsaat`, {
          method: 'POST',
          body: formData
        });
        
        actionResult = deserialize(await response.text());
        
        if (actionResult.type === 'success' && actionResult.data) {
          const apiResponse = actionResult.data;
          
          console.log('=== DEBUG CLIENTE - RESPUESTA COMPLETA ===');
          console.log('API Response:', apiResponse);
          console.log('==========================================');
          
          if (apiResponse.success) {
            // La respuesta del servidor ya incluye tanto la transacción como el QR
            const { transaccion, qr } = apiResponse.data;
            
            console.log('=== DEBUG CLIENTE - DATOS RECIBIDOS ===');
            console.log('Transacción creada:', {
              transactionId: transaccion?.transactionId,
              amount: transaccion?.amount,
              subscriberNumber: transaccion?.subscriberNumber,
              status: transaccion?.status
            });
            console.log('QR generado:', {
              qrId: qr?.qrId,
              amount: qr?.amount,
              description: qr?.description,
              qrImageLength: qr?.qrImage?.length || 0,
              dueDate: qr?.dueDate
            });
            console.log('=====================================');
            
            // Usar directamente los datos del QR que vienen del servidor
            qrGenerado = {
              ...qr,
              transactionId: transaccion.transactionId,
              amount: transaccion.amount
            };
            
            console.log('=== DEBUG CLIENTE - QR FINAL ===');
            console.log('QR Generado final:', {
              qrId: qrGenerado?.qrId,
              transactionId: qrGenerado?.transactionId,
              amount: qrGenerado?.amount,
              qrImageLength: qrGenerado?.qrImage?.length || 0
            });
            console.log('===============================');
            
            qrStatus = null;
            iniciarPollingEstado(qr.qrId);
          } else {
            error = apiResponse.message || 'Error al crear transacción y generar QR';
          }
        } else if (actionResult.type === 'failure') {
          if (Array.isArray(actionResult.data) && actionResult.data.length >= 4) {
            const [, , mensaje, codigo] = actionResult.data;
            error = `${mensaje} (${codigo})`;
          } else if (typeof actionResult.data === 'string') {
            error = actionResult.data;
          } else if (actionResult.data?.error) {
            error = actionResult.data.error;
          } else {
            error = 'Error al crear transacción y generar QR';
          }
        } else {
          error = 'Error inesperado al crear transacción y generar QR';
        }
      }
      
      if (actionResult) applyAction(actionResult);
      
    } catch (err) {
      console.error('Error en generarQREmpsaat:', err);
      
      // Mejorar el manejo de errores para mostrar mensajes específicos
      if (err instanceof Error) {
        // Si el error contiene información específica de la API, mostrarla
        if (err.message.includes('No se puede crear la transacción')) {
          error = err.message.replace('Error: 400 ', '');
        } else if (err.message.includes('Error:')) {
          error = err.message.replace('Error: ', '');
        } else {
          error = `Error: ${err.message}`;
        }
      } else {
        error = 'Error de conexión. Intenta nuevamente.';
      }
    } finally {
      isGeneratingQR = false;
    }
  }

  // Función para generar QR o pagar facturas de agua
  async function generarQR(deuda: Deuda) {
     console.log('generarQR original llamada con:', deuda);
     if (!deuda) return;
    
     // Activar loader del botón
     isGeneratingQR = true;
     error = null; // Limpiar error previo
     qrGenerado = null; // Limpiar QR previo
    
    // Variable para almacenar el resultado de la acción
    let actionResult: ActionResult | undefined;
   
    try {
     // Si el sistema usa QR para pago
     if (empresa.usaQR) {
      const formData = new FormData();
      formData.append('monto', deuda.monto.toString());
      // Mejorar descripción si es posible
      let descripcion = deuda.descripcion;
      if (deuda.tipo === 'agua' && deuda.volumenConsumo) {
        descripcion = `Pago agua - Consumo ${deuda.volumenConsumo} m³ - ${deuda.descripcion}`;
      }
      formData.append('descripcion', descripcion);
       formData.append('transactionId', `txn_${deuda.numeroCuenta || ''}_${deuda.monto}`);
       formData.append('numeroCuenta', deuda.numeroCuenta?.toString() || '');
      
      const response = await fetch(`?/generarQR`, {
        method: 'POST',
        body: formData
      });
      
       actionResult = deserialize(await response.text());
       
       if (actionResult.type === 'success' && actionResult.data) {
         // La respuesta de la API externa viene directamente en actionResult.data
         const apiResponse = actionResult.data as QRGenerationAPIResponse;
         
         if (apiResponse.success) {
           qrGenerado = apiResponse.data;
           qrStatus = null;
           
           // Iniciar long polling para verificar estado
           iniciarPollingEstado(apiResponse.data.qrId);
           
           // Eliminar el alert - mostrar directamente el QR
         } else {
           error = apiResponse.message || 'Error al generar QR';
         }
       } else if (actionResult.type === 'failure') {
         // Manejar el formato específico de error que viene en actionResult.data
         if (Array.isArray(actionResult.data) && actionResult.data.length >= 4) {
           // Formato: [success, error, mensaje, codigo]
           const [, , mensaje, codigo] = actionResult.data;
           error = `${mensaje} (${codigo})`;
         } else if (typeof actionResult.data === 'string') {
           // Si viene como string directo
           error = actionResult.data;
         } else if (actionResult.data?.error) {
           // Si viene en formato objeto con propiedad error
           error = actionResult.data.error;
         } else {
           error = 'Error al generar QR';
         }
       } else {
         error = 'Error inesperado al generar QR';
       }
     } else {
       // Si el sistema usa la API directamente para pago de facturas de agua
       // Preparar los datos para el pago
       const facturas = [{
         cuf: deuda.cuf || deuda.id?.toString() || `${deuda.numeroCuenta || ''}_${deuda.monto}`
       }];
       
       const formData = new FormData();
       formData.append('abonado', cliente?.numeroCuenta || '0');
       formData.append('facturas', JSON.stringify(facturas));
       
       const response = await fetch(`?/pagarFacturasAgua`, {
         method: 'POST',
         body: formData
       });
       
       actionResult = deserialize(await response.text());
       
       if (actionResult.type === 'success' && actionResult.data) {
         // Mostrar resultado exitoso
         alert(`Pago procesado correctamente: ${actionResult.data.mensaje || 'Operación exitosa'}`);
         
         // Recargar las deudas para actualizar la lista
         await buscarCuenta();
         
       } else if (actionResult.type === 'failure') {
         if (actionResult.data?.error) {
           error = actionResult.data.error;
           if (actionResult.data?.codigo) {
             error += ` (${actionResult.data.codigo})`;
           }
         } else {
           error = 'Error al procesar el pago';
         }
       } else {
         error = 'Error inesperado al procesar el pago';
       }
       }
      
      // Aplicar la acción del resultado
     if (actionResult) applyAction(actionResult);
      
    } catch (err) {
      console.error('Error en generarQR:', err);
      error = 'Error de conexión. Intenta nuevamente.';
    } finally {
      // Desactivar loader del botón
      isGeneratingQR = false;
    }
  }
  
  // Función para verificar estado del QR
  async function verificarEstadoQR(qrId: string) {
    try {
      const formData = new FormData();
      formData.append('qrId', qrId);
      
      const response = await fetch(`?/verificarEstadoQR`, {
        method: 'POST',
        body: formData
      });
      
     const actionResult: ActionResult = deserialize(await response.text());
      
     if (actionResult.type === 'success' && actionResult.data?.success) {
       qrStatus = actionResult.data.qrStatus;
         
         // Si el QR está pagado, usado o expirado, detener el polling
       if (actionResult.data.qrStatus.status === 'paid' || 
           actionResult.data.qrStatus.status === 'used' || 
           actionResult.data.qrStatus.status === 'expired') {
           detenerPollingEstado();
         }
         
       return actionResult.data.qrStatus;
     } else if (actionResult.type === 'failure') {
      console.error('Error verificando estado:', actionResult.data?.error);
        return null;
      } else {
        console.error('Error inesperado verificando estado');
        return null;
      }
      
      // Aplicar la acción del resultado
     if (actionResult) applyAction(actionResult);
      
    } catch (err) {
      console.error('Error de conexión al verificar estado:', err);
      return null;
    }
  }
  
  // Función para iniciar el polling del estado
  function iniciarPollingEstado(qrId: string) {
    // Verificar estado inmediatamente
    verificarEstadoQR(qrId);
    
         // Configurar polling cada 15 segundos
     pollingInterval = setInterval(async () => {
       const estado = await verificarEstadoQR(qrId);
       if (estado && (estado.status === 'paid' || estado.status === 'used' || estado.status === 'expired')) {
         detenerPollingEstado();
       }
     }, 15000); // 15 segundos
  }
  
  // Función para detener el polling
  function detenerPollingEstado() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
   }
  }
  
  // Función para pagar servicios
  async function pagarServicios(servicios: Deuda[], total: number) {
    if (!servicios || servicios.length === 0 || !cliente || !cliente.numeroCuenta) {
      error = 'No hay deudas seleccionadas para pagar';
      return;
    }

    // Activar loader
    isLoading = true;
    error = null;

    try {
      // Extraer IDs de servicios de las deudas
      const idServicios = servicios.map(deuda => deuda.id || deuda.idServicio);

      // Preparar datos para el pago
      const formData = new FormData();
      formData.append('abonado', cliente.numeroCuenta);
      formData.append('total', total.toString());
      // Usar el NIT de la empresa o un valor por defecto
      formData.append('nit', cliente.nit || '1234567');
      // Usuario que realiza la operación (podría venir de un sistema de autenticación)
      formData.append('usuario', 'usuario_portal');
      formData.append('servicios', JSON.stringify(idServicios));

      const response = await fetch(`?/pagarServicios`, {
        method: 'POST',
        body: formData
      });

      const actionResult: ActionResult = deserialize(await response.text());

      if (actionResult.type === 'success' && actionResult.data) {
        // Mostrar resultado exitoso
        alert(`Pago de servicios procesado correctamente: ${actionResult.data.mensaje || 'Operación exitosa'}`);
        
        // Recargar las deudas para actualizar la lista
        await buscarCuenta();
      } else if (actionResult.type === 'failure') {
        if (actionResult.data?.error) {
          error = actionResult.data.error;
          if (actionResult.data?.codigo) {
            error += ` (${actionResult.data.codigo})`;
          }
        } else {
          error = 'Error al procesar el pago de servicios';
        }
      } else {
        error = 'Error inesperado al procesar el pago de servicios';
      }

      // Aplicar la acción del resultado
      if (actionResult) applyAction(actionResult);
    } catch (err) {
      console.error('Error en pagarServicios:', err);
      error = 'Error de conexión. Intenta nuevamente.';
    } finally {
      isLoading = false;
    }
  }

  
  // Función para limpiar la búsqueda y volver al estado inicial
  function limpiarBusqueda() {
    cliente = undefined;
    searchResult = null;
    error = null;
    qrGenerado = null;
    qrStatus = null;
    currentStep = 1; // Resetear al paso 1
    detenerPollingEstado();
  }
  
     // Función para descargar el QR completo usando html2canvas
   async function descargarQR(qrImage: string, qrId: string) {
     try {
       // Buscar el elemento del QR generado
       const dataUrl = await takeScreenshot();
       const link = document.createElement('a');
       link.href = dataUrl!;
       link.download = `qr-${qrId}.png`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       
     } catch (err) {
       console.error('Error al descargar QR completo:', err);
       
     }
   }
   
   // Función para compartir el QR
   async function compartirQR(qrImage: string, qrId: string) {
     try {
       if (navigator.share) {
         // Convertir base64 a Blob para compartir
         const dataUrl = await takeScreenshot();
         const file = new File([dataUrl!], `qr-${qrId}.png`, { type: 'image/png' });
         
         await navigator.share({
           title: 'QR de Pago',
           text: `QR para pago - ID: ${qrId}`,
           files: [file]
         });
       } else {
         // Fallback: copiar al portapapeles o mostrar mensaj
         const dataUrl = await takeScreenshot();
         const file = new File([dataUrl!], `qr-${qrId}.png`, { type: 'image/png' });
         await navigator.clipboard.write([new ClipboardItem({
           [file.type]: file,
           presentationStyle: 'inline',
           types: file.type
         })]);
         alert('Información del QR copiada al portapapeles');
       }
     } catch (err) {
       console.error('Error al compartir QR:', err);
     }
   }

   const takeScreenshot = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const qrElement = document.querySelector('#qr-capture-content') as HTMLElement;
       if (!qrElement) {
         console.error('No se encontró el elemento del QR para descarga');
         return;
       }
    
    try {
      const canvas = await html2canvas(qrElement, {
        background: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl;
    } catch (error) {
      console.error('Error al capturar el QR:', error);
      return null;
    }
   }
   

  // Actualizar el paso actual según el estado del proceso
  $: if (qrStatus?.status === 'paid' || qrStatus?.status === 'used') {
    currentStep = 4; // Paso 4: Pago completado
  } else if (qrGenerado) {
    currentStep = 3; // Paso 3: QR generado, listo para pagar
  } else if (searchResult?.success && searchResult?.data) {
    currentStep = 2; // Paso 2: Vista de deudas
  } else {
    currentStep = 1; // Paso 1: Búsqueda
  }

  // Funciones de navegación de pasos
  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep = currentStep - 1;
      
      // Limpiar estado según el paso
      if (currentStep === 1) {
        // Volver al paso 1: limpiar búsqueda
        searchResult = null;
        cliente = undefined;
        qrGenerado = null;
        qrStatus = null;
        detenerPollingEstado();
      } else if (currentStep === 2) {
        // Volver al paso 2: limpiar QR
        qrGenerado = null;
        qrStatus = null;
        detenerPollingEstado();
      }
    }
  }
  
  function goToNextStep() {
    if (currentStep < 3) {
      currentStep = currentStep + 1;
    }
  }

  // Limpiar intervalo cuando se desmonte el componente
  onDestroy(() => {
    detenerPollingEstado();
  });
</script>

<svelte:head>
  <title>{empresa.nombre} - Pagui Recaudaciones</title>
  <meta name="description" content="Paga tu cuenta de {empresa.nombre} de forma segura y rápida" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="dashboard-layout">
  <!-- Sidebar/Header (se convierte en header en móvil) -->
  <aside class="sidebar desktop-only">
    <div class="sidebar-content">
      <!-- Información de la empresa -->
      <div class="company-section">
        <div class="company-info">
          <div class="company-logo" style="background: white">
            {#if empresa.logo && empresa.logo.includes('.png')}
              <img src="/{empresa.logo}" alt="Logo {empresa.nombre}" class="logo-image" />
            {:else}
              <span class="logo-text">{empresa.logo}</span>
            {/if}
          </div>
          <div class="company-details">
            <h2 class="company-name">{empresa.nombre}</h2>
            <div class="company-slug">{empresa.slug.toUpperCase()}</div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="sidebar-footer">
        <a href={empresa.webUrl} class="return-link">
          <span class="return-icon">←</span>
          <span>Volver a {empresa.slug.toUpperCase()}</span>
        </a>
        <div class="powered-by">
          <span>Desarrollado por</span>
          <strong>IATHINGS</strong>
        </div>
        
        <!-- Badge de seguridad unificado -->
        <div class="security-badge-unified">
          <div class="security-icons">
            <ShieldIcon size="12" />
            <LockIcon size="12" />
            <CheckCircleIcon size="12" />
          </div>
          <span class="security-message">Pago 100% Seguro y Protegido</span>
        </div>
      </div>
    </div>
  </aside>
  
  <!-- Contenido principal -->
  <main class="main-content">
    <div class="main-content-area">
      <!-- Botón Volver Global - Solo en pasos 2 y 3 -->
      {#if currentStep === 2 || currentStep === 3}
        <button 
          class="btn-back-global" 
          on:click={() => goToPreviousStep()}
          title="Volver al paso anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
          Volver
        </button>
      {/if}
        <!-- Panel de pasos del proceso -->
        <div class="content-section">
          <div class="process-steps">
              <div class="step {currentStep === 1 ? 'active' : ''} {currentStep > 1 ? 'completed' : ''}">
                <div class="step-icon">
                  <SearchIcon size="16" />
            </div>
                <div class="step-content">
                  <span class="step-title">1. Buscar Deudas</span>
                  <span class="step-description">Ingresa tu número de cuenta</span>
            </div>
            </div>
              
              <div class="step-connector {currentStep > 1 ? 'active' : ''}"></div>
              
              <div class="step {currentStep === 2 ? 'active' : ''} {currentStep > 2 ? 'completed' : ''}">
                <div class="step-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="5" height="5"></rect>
                    <rect x="3" y="16" width="5" height="5"></rect>
                    <rect x="16" y="3" width="5" height="5"></rect>
                    <path d="M21 16h-3v3h3v-3z"></path>
                    <path d="M21 21h.01"></path>
                    <path d="M12 7v3"></path>
                    <path d="M12 12h.01"></path>
                    <path d="M12 16h.01"></path>
                    <path d="M16 12h.01"></path>
                    <path d="M16 16h.01"></path>
              </svg>
            </div>
                <div class="step-content">
                  <span class="step-title">2. Generar QR</span>
                  <span class="step-description">Selecciona facturas a pagar</span>
                </div>
              </div>
              
              <div class="step-connector {currentStep > 2 ? 'active' : ''}"></div>
              
              <div class="step {currentStep === 3 ? 'active' : ''} {currentStep > 3 ? 'completed' : ''}">
                <div class="step-icon">
                  <CheckCircleIcon size="16" />
                </div>
                <div class="step-content">
                  <span class="step-title">3. Realizar Pago</span>
                  <span class="step-description">Escanea QR y paga</span>
            </div>
          </div>
        </div>
      </div>

        {#if searchResult?.success && searchResult?.data}
          <!-- Componente de lista de deudas o QR -->
          <div class="content-section">
            {#if qrGenerado}
              <QRDisplay
                qrGenerado={qrGenerado}
                qrStatus={qrStatus}
                deuda={cliente ? {
                  id: cliente.numeroCuenta?.toString(),
                  monto: qrGenerado.amount,
                  descripcion: (qrGenerado as any).description || 'Pago de servicios',
                  fecha: new Date(),
                  estado: 'pendiente',
                  numeroCuenta: cliente.numeroCuenta?.toString(),
                  volumenConsumo: cliente.volumenConsumo,
                  tipo: 'agua' as const,
                  nombreCliente: cliente.nombre
                } : {
                  id: '',
                  monto: 0,
                  descripcion: '',
                  fecha: new Date(),
                  estado: 'pendiente',
                  numeroCuenta: '',
                  volumenConsumo: 0,
                  tipo: 'agua' as const,
                  nombreCliente: ''
                }}
                {pollingInterval}
                {descargarQR}
                {compartirQR}
                {goToPreviousStep}
              />
            {:else}
              <!-- Lista de deudas cuando no hay QR -->
            <div class="payment-content">
              {#if slug === 'empsaat'}
                <EmpsaatDeudasDisplay
                  data={searchResult?.data}
                  {isGeneratingQR}
                  {isLoading}
                  {qrGenerado}
                  {error}
                  generarQR={generarQREmpsaat}
                  {limpiarCliente}
                  {goToPreviousStep}
                  onRefresh={actualizarDeudas}
                />
              {:else}
                <ListaDeudas
                  deudas={searchResult?.deudas || []}
                  {isGeneratingQR}
                  {isLoading}
                  {qrGenerado}
                  {error}
                  {generarQR}
                    {goToPreviousStep}
                />
              {/if}
              </div>
              {/if}
          </div>
        {:else}
          <!-- Formulario de búsqueda -->
          <div class="content-section search-section">
            <div class="search-header">
              <h2 class="search-title">BUSCAR DEUDAS</h2>
              <p class="search-subtitle">Ingresa tu número de cliente o abonado para consultar tus facturas pendientes</p>
            </div>
            <div class="search-content">
              <FormularioBusqueda
                bind:codigoClienteInput
                bind:tipoBusqueda
                {isLoading}
                {searchResult}
                {error}
                onBuscar={buscarCuenta}
              />
            </div>
          </div>
        {/if}
    </div>
    
    <!-- Footer móvil (parte del scroll del main content) -->
    <aside class="sidebar mobile-only">
      <div class="sidebar-content">
        <!-- Información de la empresa -->
        <div class="company-section">
          <div class="company-info">
            <div class="company-logo" style="background: white">
              {#if empresa.logo && empresa.logo.includes('.png')}
                <img src="/{empresa.logo}" alt="Logo {empresa.nombre}" class="logo-image" />
              {:else}
                <span class="logo-text">{empresa.logo}</span>
              {/if}
            </div>
            <div class="company-details">
              <h2 class="company-name">{empresa.nombre}</h2>
              <div class="company-slug">{empresa.slug.toUpperCase()}</div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="sidebar-footer">
          <a href={empresa.webUrl} class="return-link">
            <span class="return-icon">←</span>
            <span>Volver a {empresa.slug.toUpperCase()}</span>
          </a>
          <div class="powered-by">
            <span>Desarrollado por</span>
            <strong>IATHINGS</strong>
          </div>
          
          <!-- Badge de seguridad unificado -->
          <div class="security-badge-unified">
            <div class="security-icons">
              <ShieldIcon size="12" />
              <LockIcon size="12" />
              <CheckCircleIcon size="12" />
            </div>
            <span class="security-message">Pago 100% Seguro y Protegido</span>
          </div>
        </div>
      </div>
    </aside>
  </main>
</div>

<style>
  /* Variables CSS */
  :root {
    --color-primary: #667eea;
    --color-primary-dark: #5a67d8;
    --color-primary-light: #a5b4fc;
    --color-secondary: #764ba2;
    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
    --color-text-primary: #1a1a1a;
    --color-text-secondary: #666666;
    --color-text-muted: #999999;
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f8fafc;
    --color-bg-dark: #000000;
    --color-border: #e5e5e5;
    --color-border-light: #f5f5f5;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
  }

  

  
  .dashboard-layout {
    display: grid;
    grid-template-areas: 
      "sidebar main";
    grid-template-columns: 30% 70%;
    height: 100vh;
    background: var(--color-bg-primary);
    overflow: hidden;
  }
  
  /* Sidebar/Header - Estilo Cursor/Stripe */
  .sidebar {
    grid-area: sidebar;
    background: var(--color-bg-dark);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    height: 100%;
    z-index: 100;
    border-right: 1px solid #333333;
    overflow: hidden;
  }
  
  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 2rem 1.5rem;
  }
  
  
  /* Información de la empresa en sidebar */
  .company-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .company-info {
    display: flex;
    flex-direction: row;
    align-items: center;
    text-align: left;
    gap: 1rem;
  }
  
  .company-logo {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    display: flex;
    font-size: 1.3rem;
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    flex-shrink: 0;
  }
  
  .company-logo-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  
  .company-details {
    flex: 1;
    text-align: left;
  }
  
  .company-details h2 {
    font-size: 0.95rem;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 0.25rem 0;
    line-height: 1.2;
  }
  
  .company-slug {
    font-size: 0.7rem;
    font-weight: 500;
    color: #cccccc;
    margin: 0;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  

  /* Badge de seguridad unificado en sidebar */
  .security-badge-unified {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    margin-top: 0.5rem;
    text-align: center;
  }
  
  .security-badge-unified .security-icons {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #059669;
  }
  
  .security-badge-unified .security-icons svg {
    color: #059669 !important;
    flex-shrink: 0;
    display: block;
    width: 12px;
    height: 12px;
  }


  .security-message {
    color: #059669;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
  }
  
  
  /* Footer del sidebar */
  .sidebar-footer {
    margin-top: auto;
  }
  
  .return-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #ffffff;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 2rem;
    padding: 0.5rem;
    transition: all 0.3s ease;
  }
  
  .return-link:hover {
    color: #cccccc;
  }
  
  .return-icon {
    font-size: 0.875rem;
  }
  
  .powered-by {
    font-size: 0.75rem;
    color: #cccccc;
    margin-bottom: 0.75rem;
    text-align: center;
  }
  
  .powered-by strong {
    color: #ffffff;
    font-weight: 700;
    margin-left: 0.25rem;
  }
  
  
  /* Contenido principal */
  .main-content {
    grid-area: main;
    background: #ffffff;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  
  /* Contenido principal */
  .main-content-area {
    padding: 2rem;
    width: 100%;
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    min-height: 100%;
    position: relative;
  }
  
  /* Botón Volver Global */
  .btn-back-global {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    background: rgba(255, 255, 255, 0.9);
    color: #000000;
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .btn-back-global:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(0, 0, 0, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .btn-back-global svg {
    flex-shrink: 0;
  }
  
  .content-section {
    margin-bottom: 1.5rem;
    background: transparent;
    padding: 0;
  }

  
  .section-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Panel de pasos del proceso - Estilo unificado compacto */
  .process-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin: 0.5rem 0;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    opacity: 0.8;
    transform: scale(0.95);
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
    border-radius: 8px;
    position: relative;
    min-width: 80px;
  }

  .step:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .step-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
  }

  .step-icon svg {
    color: white;
  }

  .step:hover .step-icon {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .step.active:hover .step-icon {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
  }

  .step-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .step-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.1;
  }
  
  .step-description {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    line-height: 1.2;
    font-weight: 400;
  }

  /* Estados de los pasos */
  .step.active .step-icon {
    background: linear-gradient(135deg, var(--color-bg-dark), #1a1a1a) !important;
    border: 2px solid var(--color-bg-dark);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    color: white;
  }

  .step.active .step-icon svg {
    color: white !important;
  }

  .step.active .step-title {
    color: var(--color-bg-dark);
    font-weight: 700;
  }

  .step.completed .step-icon {
    background: linear-gradient(135deg, var(--color-bg-dark), #1a1a1a);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .step.completed .step-icon svg {
    color: white;
  }

  .step.completed .step-title {
    color: var(--color-bg-dark);
    font-weight: 600;
  }

  .step.completed .step-description {
    color: var(--color-bg-dark);
  }

  .step-connector.active {
    background: linear-gradient(90deg, var(--color-bg-dark), #1a1a1a);
  }

  .step-connector.active::after {
    background: #1a1a1a;
  }

  /* Estado inactivo - cuando estamos en búsqueda */
  .step:not(.active):not(.completed) .step-icon {
    background: linear-gradient(135deg, #9ca3af, #6b7280);
    box-shadow: 0 3px 8px rgba(156, 163, 175, 0.2);
    opacity: 0.6;
  }

  .step:not(.active):not(.completed) .step-icon svg {
    color: white;
  }

  .step:not(.active):not(.completed) .step-title {
    color: #9ca3af;
    font-weight: 500;
  }

  .step:not(.active):not(.completed) .step-description {
    color: #9ca3af;
    opacity: 0.7;
  }

  .step-connector:not(.active) {
    background: linear-gradient(90deg, #d1d5db, #9ca3af);
    opacity: 0.5;
  }

  .step-connector:not(.active)::after {
    background: #9ca3af;
    opacity: 0.5;
  }

  .step-connector {
    width: 30px;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    border-radius: 1px;
    position: relative;
    margin: 0 0.25rem;
  }

  .step-connector::after {
    content: '';
    position: absolute;
    right: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    background: #8b5cf6;
    border-radius: 50%;
  }

  
  
  .payment-content {
    background: transparent;
    padding: 0;
  }
  
  .search-content {
    background: transparent;
    padding: 0;
  }

  /* Sección de búsqueda más prominente */
  .search-section {
    background: transparent;
    border-radius: 0;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    padding: 1.5rem;
    margin-top: 0.5rem;
  }

  .search-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .search-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 0.25rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .search-subtitle {
    font-size: 0.8rem;
    color: #666666;
    margin: 0;
    font-weight: 400;
    line-height: 1.4;
  }
  
  
  /* Responsive Design */
  
  
  @media (max-width: 768px) {
    .dashboard-layout {
      grid-template-areas: 
        "main";
      grid-template-columns: 100%;
      grid-template-rows: 1fr;
      height: 100vh;
      overflow: hidden;
    }
    
    .main-content {
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    .sidebar {
      position: relative;
      width: 100%;
      height: auto;
      border-right: none;
      border-top: 1px solid #333333;
      overflow: visible;
    }
    
    .company-section {
      margin-bottom: 0.5rem;
      border: none;
      padding: 0.75rem;
    }

    .sidebar-content {
      padding: 1rem;
    }
    
    .company-info {
      flex-direction: row;
      gap: 0.75rem;
    }
    
    .company-logo {
      width: 40px;
      height: 40px;
      font-size: 1rem;
    }
    
    .company-name {
      font-size: 1rem;
    }
    
    .company-slug {
      font-size: 0.65rem;
    }
    
    .sidebar-footer {
      margin-top: 0.5rem;
    }
    
    .return-link {
      font-size: 0.8rem;
      padding: 0.5rem;
    }
    
    .powered-by {
      font-size: 0.7rem;
    }
    
    .security-badge-unified {
      margin-top: 0.5rem;
    }
    
    .security-message {
      font-size: 0.65rem;
    }
    
    .main-content-area {
      padding: 1rem;
      width: 100%;
    }
  }

  /* Clases de visibilidad responsive */
  .desktop-only {
    display: block;
  }
  
  .mobile-only {
    display: none;
  }

  /* Header móvil */
  .mobile-header {
    background: var(--color-bg-dark);
      padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .mobile-header-content {
    max-width: 100%;
    margin: 0 auto;
  }

  .mobile-company-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    text-align: left;
  }

  .mobile-company-logo {
    flex-shrink: 0;
    background: white;
    padding: 0.5rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    width: 45px;
    height: 45px;
    overflow: hidden;
  }

  .mobile-logo-image {
    height: 100%;
    width: 100%;
    object-fit: contain;
    border-radius: 4px;
  }

  .mobile-logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: #333333;
  }

  .mobile-company-details {
    flex: 1;
    text-align: left;
    min-width: 0;
  }

  .mobile-company-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 0.25rem 0;
    line-height: 1.2;
  }
  
  .mobile-company-slug {
    font-size: 0.7rem;
    font-weight: 500;
    color: #cccccc;
    margin: 0;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }


  .mobile-company-status {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-security-badge-unified {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.25rem;
    text-align: left;
    margin-top: 0.25rem;
  }
  
  .mobile-security-badge-unified .security-icons {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #059669;
  }
  
  .mobile-security-badge-unified .security-icons svg {
    color: #059669 !important;
    flex-shrink: 0;
    display: block;
    width: 12px;
    height: 12px;
  }

  .mobile-footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .mobile-return-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #ffffff;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.5rem;
    transition: all 0.3s ease;
  }

  .mobile-return-link:hover {
    color: #cccccc;
  }

  .mobile-powered-by {
    font-size: 0.7rem;
    color: #cccccc;
    text-align: center;
  }

  .mobile-powered-by strong {
    color: #ffffff;
    font-weight: 700;
    margin-left: 0.25rem;
  }

  .security-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 4px;
    color: #059669;
    font-size: 0.65rem;
    font-weight: 500;
    transition: all 0.2s ease;
    min-width: fit-content;
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .security-badge:hover {
    background: rgba(34, 197, 94, 0.25);
  }

  .security-badge svg {
    flex-shrink: 0;
    color: #059669;
  }

  /* Estilos compartidos para badges unificados */

  .mobile-security-badge-unified .security-message {
    color: #059669;
    font-size: 0.55rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
  }

  /* Responsive breakpoints */
  @media (max-width: 768px) {
    .desktop-only {
      display: none !important;
    }
    
    .mobile-only {
      display: block !important;
    }

    .dashboard-layout {
      grid-template-areas: 
        "main";
      grid-template-columns: 100%;
      grid-template-rows: 1fr;
      height: 100vh;
      overflow: hidden;
    }

    .main-content {
      /* Grid area ya definido */
    }

    .content-wrapper {
      padding: 0;
    }

    .main-content-area {
      padding: 1rem;
      width: 100%;
    }
    
    .btn-back-global {
      top: 0.5rem;
      left: 0.5rem;
      padding: 0.4rem 0.8rem;
      font-size: 0.75rem;
    }

    .mobile-header {
      position: sticky;
      top: 0;
      z-index: 100;
    }


    .mobile-security-badge-unified .security-icons svg {
      color: #059669 !important;
      display: block !important;
      width: 14px !important;
      height: 14px !important;
    }

    .mobile-security-badge-unified .security-icons svg {
      color: #059669 !important;
      display: block !important;
      width: 12px !important;
      height: 12px !important;
    }

    .mobile-security-badge-unified .security-message {
      font-size: 0.55rem;
    }
  }

</style>