import type { QRGenerationAPIResponse, QRStatusAPIResponse, QRCancellationAPIResponse, QRPaymentsAPIResponse } from '../types/api';
import type { EmpresaConfig } from '../config/empresas';

/**
 * Servicio para generación y manejo de QR
 * Directo y simple, sin abstracciones innecesarias
 */
export class QRService {
  private empresaConfig: EmpresaConfig;

  constructor(empresaConfig: EmpresaConfig) {
    this.empresaConfig = empresaConfig;
  }

  /**
   * Realiza una llamada HTTP simple a la API de Pagui
   */
  private async callPaguiAPI<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'DELETE' = 'GET', 
    body?: any
  ): Promise<T> {
    const response = await fetch(`${this.empresaConfig.paguiBaseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.empresaConfig.paguiApikey
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Genera un QR de pago de forma simplificada
   */
  async generarQR(params: {
    transactionId: string;
    amount: number;
    description: string;
  }): Promise<QRGenerationAPIResponse> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 días de vencimiento

    return this.callPaguiAPI<QRGenerationAPIResponse>('/qr/generate', 'POST', {
      transactionId: params.transactionId,
      amount: params.amount,
      description: params.description,
      bankId: 1,
      dueDate: dueDate.toISOString(),
      singleUse: false,
      modifyAmount: false
    });
  }

  /**
   * Verifica el estado de un QR
   */
  async verificarEstadoQR(qrId: string): Promise<QRStatusAPIResponse> {
    return this.callPaguiAPI<QRStatusAPIResponse>(`/qr/${qrId}`, 'GET');
  }

  /**
   * Cancela un QR
   */
  async cancelarQR(qrId: string): Promise<QRCancellationAPIResponse> {
    return this.callPaguiAPI<QRCancellationAPIResponse>(`/qr/${qrId}`, 'DELETE');
  }

  /**
   * Obtiene los pagos de un QR
   */
  async obtenerPagosQR(qrId: string): Promise<QRPaymentsAPIResponse> {
    return this.callPaguiAPI<QRPaymentsAPIResponse>(`/qr/${qrId}/payments`, 'GET');
  }
}
