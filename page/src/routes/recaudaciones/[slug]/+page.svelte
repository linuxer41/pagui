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

  // Función para obtener información detallada del abonado
  async function obtenerInfoAbonado(numeroAbonado: string) {
    if (!numeroAbonado) {
      error = 'Número de abonado no proporcionado';
      return;
    }

    // Activar loader
    isLoading = true;
    error = null;

    try {
      const formData = new FormData();
      formData.append('abonado', numeroAbonado);

      const response = await fetch(`?/obtenerAbonado`, {
        method: 'POST',
        body: formData
      });

      const actionResult: ActionResult = deserialize(await response.text());

      if (actionResult.type === 'success' && actionResult.data) {
        // Actualizar información del cliente
        if (cliente) {
          cliente = {
            ...cliente,
            ...actionResult.data.abonado
          };
        } else {
          // Si no hay cliente, crear uno nuevo
          cliente = {
            nombre: actionResult.data.abonado.nombre || 'Cliente',
            numeroCuenta: numeroAbonado,
            ...actionResult.data.abonado
          };
        }
        
        // Mostrar mensaje de éxito si es necesario
        console.log('Información de abonado obtenida:', actionResult.data.mensaje);
      } else if (actionResult.type === 'failure') {
        if (actionResult.data?.error) {
          error = actionResult.data.error;
          if (actionResult.data?.codigo) {
            error += ` (${actionResult.data.codigo})`;
          }
        } else {
          error = 'Error al obtener información del abonado';
        }
      } else {
        error = 'Error inesperado al obtener información del abonado';
      }

      // Aplicar la acción del resultado
      if (actionResult) applyAction(actionResult);
    } catch (err) {
      console.error('Error en obtenerInfoAbonado:', err);
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

<div class="empresa-page" style="--empresa-color: {empresa.color}; --empresa-gradiente: {empresa.gradiente}">
     <!-- Header de la empresa -->
   <div class="header">
     <div class="header-content">
       <div class="logo">{empresa.logo}</div>
       <div class="company-info">
         <h1 class="company-name">{empresa.nombre}</h1>
         <p class="company-description">{empresa.descripcion}</p>
       </div>
     </div>
   </div>

     <!-- Contenido principal -->
   <div class="content">
    {#if searchResult?.success && searchResult?.data}
              <!-- Mostrar deuda encontrada -->
       <div class="debt-content">
        
        
        <!-- Componente de lista de deudas (diferente para cada empresa) -->
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
        
        <!-- Componente para mostrar el QR generado para cada deuda -->
        {#if qrGenerado}
          <QRDisplay
            qrGenerado={qrGenerado}
            qrStatus={qrStatus}
            deuda={{}}
            {pollingInterval}
            {descargarQR}
            {compartirQR}
          />
        {/if}
      </div>
         {:else}
      <!-- Formulario de búsqueda -->
      <FormularioBusqueda
        bind:codigoClienteInput
        {isLoading}
        {searchResult}
        {error}
        instrucciones={empresa.instrucciones}
        onBuscar={buscarCuenta}
      />
            {/if}
             </div>
</div>

 <style>
  /* Estos estilos se han movido a los componentes individuales */
   
   .empresa-page {
     min-height: 100vh;
     background: linear-gradient(135deg, var(--empresa-gradiente));
     color: var(--text-primary);
     position: relative;
     overflow-x: hidden;
   }
  
     .empresa-page::before {
     content: '';
     position: absolute;
     top: 0;
     left: 0;
     right: 0;
     bottom: 0;
     background: 
       radial-gradient(circle at 20% 80%, #ffffff 0%, transparent 50%),
       radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 50%);
     opacity: 0.1;
     pointer-events: none;
   }
   
   .header {
     background: rgba(var(--white), 0.95);
     backdrop-filter: blur(10px);
     border-bottom: 1px solid var(--border-color);
     padding: 1.25rem 1.5rem;
     position: relative;
     z-index: 10;
     box-shadow: var(--shadow-sm);
   }
  
     .header-content {
     display: flex;
     align-items: center;
     gap: 1rem;
     max-width: 800px;
     margin: 0 auto;
   }
   
   .logo {
     font-size: 2rem;
     background: var(--gradient-primary);
     border-radius: var(--radius-full);
     width: 55px;
     height: 55px;
     display: flex;
     align-items: center;
     justify-content: center;
     border: 2px solid rgba(var(--white), 0.8);
     box-shadow: var(--shadow);
     animation: float 3s ease-in-out infinite;
   }
  
     @keyframes float {
     0%, 100% { transform: translateY(0px); }
     50% { transform: translateY(-5px); }
   }
  
           .company-name {
     font-size: 1.6rem;
     font-weight: 600;
     margin: 0 0 0.25rem 0;
     color: var(--text-primary);
   }
   
   .company-description {
     font-size: 0.8rem;
     margin: 0;
     color: var(--text-secondary);
     line-height: 1.3;
   }
  
     .content {
     max-width: 800px;
     margin: 0 auto;
     padding: 1rem;
     position: relative;
     z-index: 10;
   }
  
        .debt-content {
     text-align: center;
   }
   
   /* Efectos de partículas flotantes */
  .empresa-page::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
      radial-gradient(circle at 25% 25%, #ffffff 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, #ffffff 0%, transparent 50%);
    opacity: 0.05;
    pointer-events: none;
    z-index: 1;
  }
  
     @media (max-width: 768px) {
     .header {
       padding: 0.75rem 1rem;
     }
     
     .header-content {
       flex-direction: column;
       text-align: center;
       gap: 0.75rem;
     }
     
     .logo {
       width: 45px;
       height: 45px;
       font-size: 1.8rem;
     }
     
     .company-name {
       font-size: 1.4rem;
     }
     
     .content {
       padding: 0.75rem;
     }
   }
</style>