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
      formData.append('abonado', codigoClienteInput.trim());
      
      const response = await fetch(`?/buscarDeudas`, {
        method: 'POST',
        body: formData
      });

      const actionResult: ActionResult = deserialize(await response.text());
      console.log('result', actionResult);
      
      if (actionResult.type === 'success' && actionResult.data) {
        // Usar la respuesta tal como viene de la API
        searchResult = actionResult.data;
        
        // Crear cliente simple usando el abonado
        cliente = {
          nombre: 'Cliente',
          numeroCuenta: codigoClienteInput.trim()
        };
        
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

  // Función para obtener información del abonado (para el botón de sincronización)
  async function obtenerInfoAbonado(numeroCuenta: string) {
    if (!numeroCuenta) return;
    
    isLoading = true;
    error = null;
    
    try {
      const formData = new FormData();
      formData.append('abonado', numeroCuenta);
      
      const response = await fetch(`?/obtenerAbonado`, {
        method: 'POST',
        body: formData
      });

      const actionResult: ActionResult = deserialize(await response.text());
      
      if (actionResult.type === 'success' && actionResult.data) {
        // Actualizar la información del cliente
        cliente = actionResult.data.abonado;
        
        // Recargar las deudas
        await buscarCuenta();
      } else if (actionResult.type === 'failure') {
        error = actionResult.data?.error || 'Error al obtener información del abonado';
        if (actionResult.data?.codigo) {
          error += ` (${actionResult.data.codigo})`;
        }
      } else {
        error = 'Error inesperado al obtener información del abonado';
      }
      
      if (actionResult) applyAction(actionResult);
      
    } catch (err) {
      console.error('Error en obtenerInfoAbonado:', err);
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
    
    // Limpiar polling si está activo
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }
  
  // Función para generar QR específica para EMPSAAT
  async function generarQREmpsaat(deudaAgua: any) {
    console.log('generarQREmpsaat llamada con:', deudaAgua);
    if (!deudaAgua) return;
    
    // Activar loader del botón
    isGeneratingQR = true;
    error = null;
    qrGenerado = null;
    
    let actionResult: ActionResult | undefined;
    
    try {
      if (empresa.usaQR) {
        const formData = new FormData();
        formData.append('monto', deudaAgua.importeFactura.toString());
        formData.append('descripcion', `Consumo agua (${deudaAgua.consumoM3} m³) - Factura #${deudaAgua.factura}`);
        formData.append('transactionId', `txn_${deudaAgua.abonado}_${deudaAgua.factura}_${deudaAgua.importeFactura}`);
        formData.append('numeroCuenta', deudaAgua.abonado.toString());
        
        const response = await fetch(`?/generarQR`, {
          method: 'POST',
          body: formData
        });
        
        actionResult = deserialize(await response.text());
        
        if (actionResult.type === 'success' && actionResult.data) {
          const apiResponse = actionResult.data as QRGenerationAPIResponse;
          
          if (apiResponse.success) {
            qrGenerado = apiResponse.data;
            qrStatus = null;
            iniciarPollingEstado(apiResponse.data.qrId);
          } else {
            error = apiResponse.message || 'Error al generar QR';
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
            error = 'Error al generar QR';
          }
        } else {
          error = 'Error inesperado al generar QR';
        }
      }
      
      if (actionResult) applyAction(actionResult);
      
    } catch (err) {
      console.error('Error en generarQREmpsaat:', err);
      error = 'Error de conexión. Intenta nuevamente.';
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
      formData.append('descripcion', deuda.descripcion);
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
    infoAbonadoObtenida = false;
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
    const qrElement = document.querySelector('.qr-download-only') as HTMLElement;
       if (!qrElement) {
         console.error('No se encontró el elemento del QR para descarga');
         return;
       }
    
    // Mostrar temporalmente el elemento para la captura
    qrElement.style.display = 'block';
    qrElement.style.position = 'fixed';
    qrElement.style.top = '50%';
    qrElement.style.left = '50%';
    qrElement.style.transform = 'translate(-50%, -50%)';
    qrElement.style.zIndex = '9999';
    
    try {
      const canvas = await html2canvas(qrElement);
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl;
    } finally {
      // Ocultar el elemento después de la captura
      qrElement.style.display = 'none';
      qrElement.style.position = 'fixed';
      qrElement.style.top = '-9999px';
      qrElement.style.left = '-9999px';
      qrElement.style.transform = 'none';
      qrElement.style.zIndex = 'auto';
    }
   }
   
     // Variable para controlar si ya se obtuvo la información del abonado
  let infoAbonadoObtenida = false;
  
  // Llamar automáticamente a obtenerInfoAbonado cuando hay datos de EMPSAAT (solo una vez)
  $: if (searchResult?.success && searchResult?.data && slug === 'empsaat' && cliente?.numeroCuenta && !infoAbonadoObtenida) {
    infoAbonadoObtenida = true;
    obtenerInfoAbonado(cliente.numeroCuenta);
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
  <!-- Panel izquierdo (oscuro) -->
  <aside class="sidebar">
    <div class="sidebar-content">
      <!-- Información de la empresa -->
      <div class="company-section">
        <div class="company-info-sidebar">
          <div class="company-logo-sidebar" style="background: white">
            {#if empresa.logo && empresa.logo.includes('.png')}
              <img src="/{empresa.logo}" alt="Logo {empresa.nombre}" class="company-logo-image" />
            {:else}
              <span class="logo-text">{empresa.logo}</span>
            {/if}
          </div>
          <div class="company-details-sidebar">
            <h2 class="company-name-sidebar">{empresa.nombre}</h2>
            <p class="company-description-sidebar">{empresa.descripcion}</p>
            <div class="company-status">
              <div class="status-dot"></div>
              <span>Sistema Activo</span>
            </div>
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
          <span>Powered by</span>
          <strong>Pagui</strong>
        </div>
        <div class="footer-links">
          <a href="#" class="footer-link">Términos</a>
          <a href="#" class="footer-link">Privacidad</a>
        </div>
      </div>
    </div>
  </aside>
  
  <!-- Panel derecho (claro) -->
  <main class="main-content">
    <div class="content-wrapper">
      <!-- Header con iconos de seguridad -->
      <div class="dashboard-header">
        <div class="header-content">
          {#if empresa.logo && empresa.logo.includes('.png')}
            <div class="header-logo">
              <img src="/{empresa.logo}" alt="Logo {empresa.nombre}" class="header-logo-image" />
            </div>
          {/if}
          <div class="security-badges">
            <div class="security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <span>Seguro</span>
            </div>
            <div class="security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Protegido</span>
            </div>
            <div class="security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
                <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
              </svg>
              <span>Verificado</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenido principal -->
      <div class="main-content-area">
        {#if searchResult?.success && searchResult?.data}
          <!-- Componente de lista de deudas -->
          <div class="content-section">
            <h2 class="section-title">OPCIONES DE PAGO</h2>
            <div class="payment-content">
              {#if slug === 'empsaat'}
                <EmpsaatDeudasDisplay
                  data={searchResult?.data}
                  cliente={cliente}
                  {isGeneratingQR}
                  {isLoading}
                  {qrGenerado}
                  {error}
                  generarQR={generarQREmpsaat}
                  {pagarServicios}
                  {obtenerInfoAbonado}
                  {limpiarCliente}
                />
              {:else}
                <ListaDeudas
                  deudas={searchResult?.deudas || []}
                  {isGeneratingQR}
                  {isLoading}
                  {qrGenerado}
                  {error}
                  {generarQR}
                  {pagarServicios}
                />
              {/if}
              
              <!-- Componente para mostrar el QR generado -->
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
                />
              {/if}
            </div>
          </div>
        {:else}
          <!-- Formulario de búsqueda -->
          <div class="content-section">
            <h2 class="section-title">BÚSQUEDA DE ABONADO</h2>
            <div class="search-content">
              <FormularioBusqueda
                bind:codigoClienteInput
                {isLoading}
                {searchResult}
                {error}
                instrucciones={empresa.instrucciones}
                onBuscar={buscarCuenta}
              />
            </div>
          </div>
        {/if}
      </div>
    </div>
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

  /* Reset y estilos base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    color: var(--color-text-primary);
    background: var(--color-bg-primary);
  }
  
  .dashboard-layout {
    display: flex;
    min-height: 100vh;
    background: var(--color-bg-primary);
  }
  
  /* Panel izquierdo (oscuro) - Estilo Cursor/Stripe */
  .sidebar {
    width: 320px;
    background: var(--color-bg-dark);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100%;
    left: 0;
    top: 0;
    z-index: 100;
    border-right: 1px solid #333333;
  }
  
  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 2rem 1.5rem;
  }
  
  
  /* Información de la empresa en sidebar */
  .company-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .company-info-sidebar {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }
  
  .company-logo-sidebar {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }
  
  .company-logo-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  
  .company-details-sidebar h2 {
    font-size: 1.15rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.5rem;
  }
  
  .company-details-sidebar p {
    font-size: 0.875rem;
    color: #cccccc;
    line-height: 1.4;
    margin-bottom: 1rem;
  }
  
  .company-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-success);
  }
  
  .company-status .status-dot {
    width: 8px;
    height: 8px;
    background: var(--color-success);
    border-radius: 50%;
  }
  
  
  /* Footer del sidebar */
  .sidebar-footer {
    margin-top: auto;
  }
  
  .return-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ffffff;
    text-decoration: none;
    font-size: 0.875rem;
    margin-bottom: 2rem;
    transition: color 0.2s ease;
  }
  
  .return-link:hover {
    color: #cccccc;
  }
  
  .return-icon {
    font-size: 0.875rem;
  }
  
  .powered-by {
    font-size: 0.75rem;
    color: #888888;
    margin-bottom: 0.5rem;
  }
  
  .powered-by strong {
    color: #ffffff;
    font-weight: 600;
  }
  
  .footer-links {
    display: flex;
    gap: 1rem;
  }
  
  .footer-link {
    color: #888888;
    text-decoration: none;
    font-size: 0.75rem;
    transition: color 0.2s ease;
  }
  
  .footer-link:hover {
    color: #ffffff;
  }
  
  /* Panel derecho (claro) */
  .main-content {
    flex: 1;
    margin-left: 320px;
    background: #ffffff;
    overflow-y: auto;
  }
  
  .content-wrapper {
    min-height: 100vh;
    padding: 0;
  }
  
  /* Header del dashboard */
  .dashboard-header {
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border);
    padding: 1.5rem 2rem;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .header-content {
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .header-logo {
    display: flex;
    align-items: center;
  }
  
  .header-logo-image {
    height: 40px;
    width: auto;
    object-fit: contain;
  }
  
  .security-badges {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    justify-content: center;
  }
  
  .security-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: var(--radius-sm);
    color: var(--color-success);
    font-size: 0.7rem;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .security-badge:hover {
    background: rgba(34, 197, 94, 0.15);
    transform: translateY(-1px);
  }
  
  .security-badge svg {
    flex-shrink: 0;
  }
  
  /* Contenido principal */
  .main-content-area {
    padding: 2rem;
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .content-section {
    margin-bottom: 2rem;
  }
  
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }
  
  
  .payment-content {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
  }
  
  .search-content {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
  }
  
  
  /* Responsive Design */
  @media (max-width: 1200px) {
    .sidebar {
      width: 280px;
    }
    
    .main-content {
      margin-left: 280px;
    }
    
    .main-content-area {
      padding: 1.5rem;
    }
  }
  
  @media (max-width: 1024px) {
    .sidebar {
      width: 260px;
    }
    
    .main-content {
      margin-left: 260px;
    }
    
    .main-content-area {
      padding: 1.25rem;
    }
  }
  
  @media (max-width: 768px) {
    .dashboard-layout {
      flex-direction: column;
    }
    
    .sidebar {
      position: relative;
      width: 100%;
      height: auto;
      order: 2;
    }
    
    .sidebar-content {
      padding: 1.25rem 1rem;
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
    
    .main-content {
      margin-left: 0;
      order: 1;
    }
    
    
    .sidebar-footer {
      margin-top: 0;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .return-link {
      margin-bottom: 0;
      font-size: 0.8rem;
    }
    
    .powered-by {
      margin-bottom: 0;
      font-size: 0.7rem;
    }
    
    .footer-links {
      display: none;
    }
    
    .dashboard-header {
      padding: 1rem 1.5rem;
    }
    
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .header-right {
      align-self: flex-end;
    }
    
    .company-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .company-details h1 {
      font-size: 1.25rem;
    }
    
    .company-details p {
      font-size: 0.8rem;
    }
    
    .security-badges {
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    
    .security-badge {
      padding: 0.25rem 0.375rem;
      font-size: 0.65rem;
    }
    
    .main-content-area {
      padding: 1rem;
    }
  }
  
  @media (max-width: 480px) {
    .sidebar-content {
      padding: 1rem 0.75rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    
    
    .sidebar-footer {
      gap: 0.5rem;
    }
    
    .return-link {
      font-size: 0.75rem;
    }
    
    .powered-by {
      font-size: 0.65rem;
    }
    
    .dashboard-header {
      padding: 0.75rem 1rem;
    }
    
    .company-details h1 {
      font-size: 1.125rem;
    }
    
    .company-details p {
      font-size: 0.75rem;
    }
    
    .security-badge {
      padding: 0.2rem 0.3rem;
      font-size: 0.6rem;
    }
    
    .main-content-area {
      padding: 0.75rem;
    }
    
    .content-section {
      margin-bottom: 1.5rem;
    }
    
    .account-info,
    .payment-content,
    .search-content,
    .company-details-section {
      padding: 1rem;
    }
    
    .status-indicator {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }
  }
</style>