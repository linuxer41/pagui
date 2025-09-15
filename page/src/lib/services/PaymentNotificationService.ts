import { EmpsaatService } from './EmpsaatService';
import { getEmpresaConfig } from '../config/empresas';

export interface PaymentNotification {
  qrId: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  amount: number;
  transactionId: string;
  abonado: string;
  deudasAgua: any[];
  deudasServicios: any[];
  timestamp: number;
}

export class PaymentNotificationService {
  private static instance: PaymentNotificationService;
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private maxPollingTime = 30 * 60 * 1000; // 30 minutos
  private pollingInterval = 10 * 1000; // 10 segundos

  static getInstance(): PaymentNotificationService {
    if (!PaymentNotificationService.instance) {
      PaymentNotificationService.instance = new PaymentNotificationService();
    }
    return PaymentNotificationService.instance;
  }

  // Iniciar monitoreo de pago
  async startPaymentMonitoring(
    qrId: string,
    transactionId: string,
    abonado: string,
    deudasAgua: any[],
    deudasServicios: any[],
    amount: number,
    empresaSlug: string
  ) {
    console.log(`Iniciando monitoreo de pago para QR: ${qrId}`);
    
    // Obtener configuración de la empresa
    const empresa = getEmpresaConfig(empresaSlug);
    if (!empresa?.apiKey) {
      throw new Error('Configuración de empresa no encontrada');
    }

    // Actualizar estado inicial
    this.updatePaymentStatus(qrId, {
      qrId,
      status: 'pending',
      amount,
      transactionId,
      abonado,
      deudasAgua,
      deudasServicios,
      timestamp: Date.now()
    });

    // Iniciar polling
    this.startPolling(qrId, abonado, empresa.apiKey, empresaSlug);

    // Configurar timeout
    setTimeout(() => {
      this.stopPolling(qrId);
      this.updatePaymentStatus(qrId, {
        qrId,
        status: 'expired',
        amount,
        transactionId,
        abonado,
        deudasAgua,
        deudasServicios,
        timestamp: Date.now()
      });
    }, this.maxPollingTime);
  }

  // Iniciar polling del estado del QR
  private startPolling(qrId: string, abonado: string, apiKey: string, empresaSlug: string) {
    const interval = setInterval(async () => {
      try {
        console.log(`Verificando estado de pago para QR: ${qrId}`);
        
        // Verificar si hay deudas pendientes
        const response = await EmpsaatService.buscarDeudasPorCriterio(abonado, 'abonado', apiKey);
        
        if (response.success && response.data?.deudas) {
          const abonadoData = response.data.deudas.find((a: any) => a.abonado.abonado.toString() === abonado);
          
          if (abonadoData) {
            // Verificar si las deudas específicas siguen pendientes
            const deudasPendientes = this.checkPendingDebts(abonadoData, qrId);
            
            if (deudasPendientes.length === 0) {
              // Todas las deudas fueron pagadas
              console.log(`Pago confirmado para QR: ${qrId}`);
              await this.processPayment(qrId, abonado, apiKey, empresaSlug);
              this.stopPolling(qrId);
            }
          }
        }
      } catch (error) {
        console.error(`Error en polling para QR ${qrId}:`, error);
      }
    }, this.pollingInterval);

    this.pollingIntervals.set(qrId, interval);
  }

  // Verificar deudas pendientes
  private checkPendingDebts(abonadoData: any, qrId: string): any[] {
    const status = this.getPaymentStatus(qrId);
    if (!status) return [];

    const pendingDebts = [];

    // Verificar deudas de agua
    for (const deudaAgua of status.deudasAgua) {
      const deudaApi = abonadoData.deudasAgua.find((d: any) => d.factura === deudaAgua.factura);
      if (deudaApi && !deudaApi.fechaPago) {
        pendingDebts.push(deudaAgua);
      }
    }

    // Verificar deudas de servicios
    for (const deudaServicio of status.deudasServicios) {
      const deudaApi = abonadoData.deudasServicios.find((d: any) => 
        (d.noSolicitud === deudaServicio.noSolicitud) || 
        (d.idServicio === deudaServicio.noSolicitud) ||
        (d.id === deudaServicio.noSolicitud)
      );
      if (deudaApi && !deudaApi.fechaPago) {
        pendingDebts.push(deudaServicio);
      }
    }

    return pendingDebts;
  }

  // Procesar pago cuando se confirma
  private async processPayment(qrId: string, abonado: string, apiKey: string, empresaSlug: string) {
    try {
      const status = this.getPaymentStatus(qrId);
      if (!status) return;

      console.log(`Procesando pago para QR: ${qrId}`);

      // Llamar a la API de EMPSAAT para integrar el pago
      const response = await this.integratePayment(abonado, status.deudasAgua, status.deudasServicios, apiKey);
      
      if (response.success) {
        this.updatePaymentStatus(qrId, {
          ...status,
          status: 'paid',
          timestamp: Date.now()
        });
        console.log(`Pago integrado exitosamente para QR: ${qrId}`);
      } else {
        this.updatePaymentStatus(qrId, {
          ...status,
          status: 'failed',
          timestamp: Date.now()
        });
        console.error(`Error integrando pago para QR: ${qrId}`, response.error);
      }
    } catch (error) {
      console.error(`Error procesando pago para QR: ${qrId}`, error);
      const status = this.getPaymentStatus(qrId);
      if (status) {
        this.updatePaymentStatus(qrId, {
          ...status,
          status: 'failed',
          timestamp: Date.now()
        });
      }
    }
  }

  // Integrar pago con EMPSAAT usando el nuevo flujo de transacciones
  private async integratePayment(abonado: string, deudasAgua: any[], deudasServicios: any[], apiKey: string) {
    try {
      // Obtener el transaction_id del estado del pago
      const status = this.getPaymentStatusByAbonado(abonado);
      if (!status || !status.transactionId) {
        throw new Error('No se encontró transaction_id para completar la transacción');
      }

      // Preparar datos para completar la transacción en EMPSAAT
      const paymentData = {
        transactionId: status.transactionId,
        paymentMethod: 'qr', // Método de pago por QR
        amountPaid: status.amount
      };

      console.log('Completando transacción EMPSAAT con datos:', paymentData);

      // Hacer llamada a la API de EMPSAAT para completar la transacción
      const response = await fetch('http://localhost:3002/deudas/transaction/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Error en API de EMPSAAT: ${response.status} - ${errorData?.error || 'Error desconocido'}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Transacción completada exitosamente en EMPSAAT:', result.data);
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Error al completar transacción en EMPSAAT');
      }
    } catch (error) {
      console.error('Error integrando pago con EMPSAAT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Método auxiliar para obtener el estado de pago por abonado
  private getPaymentStatusByAbonado(abonado: string): PaymentNotification | null {
    for (const [qrId, status] of this.paymentStatuses.entries()) {
      if (status.abonado === abonado) {
        return status;
      }
    }
    return null;
  }

  // Detener polling
  stopPolling(qrId: string) {
    const interval = this.pollingIntervals.get(qrId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(qrId);
      console.log(`Polling detenido para QR: ${qrId}`);
    }
  }

  // Actualizar estado de pago
  private updatePaymentStatus(qrId: string, status: PaymentNotification) {
    // Aquí se podría notificar a través de SSE
    console.log(`Estado de pago actualizado para QR ${qrId}:`, status.status);
  }

  // Obtener estado de pago
  getPaymentStatus(qrId: string): PaymentNotification | undefined {
    // Aquí se podría obtener del store de estados
    return undefined;
  }

  // Limpiar recursos
  cleanup() {
    for (const [qrId, interval] of this.pollingIntervals.entries()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
  }
}
