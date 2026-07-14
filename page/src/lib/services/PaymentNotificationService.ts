import { defaultEmpsaatService } from './EmpsaatService';

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
  private paymentStatuses = new Map<string, PaymentNotification>();
  private maxPollingTime = 30 * 60 * 1000;
  private pollingInterval = 10 * 1000;

  static getInstance(): PaymentNotificationService {
    if (!PaymentNotificationService.instance) {
      PaymentNotificationService.instance = new PaymentNotificationService();
    }
    return PaymentNotificationService.instance;
  }

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

    this.startPolling(qrId, abonado, empresaSlug);

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

  private startPolling(qrId: string, abonado: string, empresaSlug: string) {
    const interval = setInterval(async () => {
      try {
        console.log(`Verificando estado de pago para QR: ${qrId}`);

        const response = await defaultEmpsaatService.buscarDeudasPorCriterio(abonado, 'abonado');

        if (response.success && response.data?.deudas) {
          const abonadoData = response.data.deudas.find((a: any) => a.abonado.abonado.toString() === abonado);

          if (abonadoData) {
            const deudasPendientes = this.checkPendingDebts(abonadoData, qrId);

            if (deudasPendientes.length === 0) {
              console.log(`Pago confirmado para QR: ${qrId}`);
              await this.processPayment(qrId, abonado, empresaSlug);
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

  private checkPendingDebts(abonadoData: any, qrId: string): any[] {
    const status = this.getPaymentStatus(qrId);
    if (!status) return [];

    const pendingDebts = [];

    for (const deudaAgua of status.deudasAgua) {
      const deudaApi = abonadoData.deudasAgua.find((d: any) => d.factura === deudaAgua.factura);
      if (deudaApi && !deudaApi.fechaPago) {
        pendingDebts.push(deudaAgua);
      }
    }

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

  private async processPayment(qrId: string, abonado: string, empresaSlug: string) {
    try {
      const status = this.getPaymentStatus(qrId);
      if (!status) return;

      console.log(`Procesando pago para QR: ${qrId}`);

      const response = await this.integratePayment(abonado, status.deudasAgua, status.deudasServicios);

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

  private async integratePayment(abonado: string, deudasAgua: any[], deudasServicios: any[]) {
    try {
      const status = this.getPaymentStatusByAbonado(abonado);
      if (!status || !status.transactionId) {
        throw new Error('No se encontró transaction_id para completar la transacción');
      }

      const paymentData = {
        transactionId: status.transactionId,
        paymentMethod: 'qr' as const,
        amountPaid: status.amount
      };

      console.log('Completando transacción vía backend Pagui:', paymentData);

      return await defaultEmpsaatService.completarTransaccion(paymentData);
    } catch (error) {
      console.error('Error integrando pago:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  private getPaymentStatusByAbonado(abonado: string): PaymentNotification | null {
    for (const [, status] of this.paymentStatuses.entries()) {
      if (status.abonado === abonado) {
        return status;
      }
    }
    return null;
  }

  stopPolling(qrId: string) {
    const interval = this.pollingIntervals.get(qrId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(qrId);
      console.log(`Polling detenido para QR: ${qrId}`);
    }
  }

  private updatePaymentStatus(qrId: string, status: PaymentNotification) {
    this.paymentStatuses.set(qrId, status);
    console.log(`Estado de pago actualizado para QR ${qrId}:`, status.status);
  }

  getPaymentStatus(qrId: string): PaymentNotification | undefined {
    return this.paymentStatuses.get(qrId);
  }

  cleanup() {
    for (const [, interval] of this.pollingIntervals.entries()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
  }
}