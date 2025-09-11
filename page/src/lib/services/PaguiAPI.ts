import type { 
  QRGenerationAPIResponse, 
  QRStatusAPIResponse, 
  QRCancellationAPIResponse,
  QRPaymentsAPIResponse
} from '$lib/types/api';

export interface PaguiConfig {
  apiKey: string;
  baseUrl: string;
}

export class PaguiAPI {
  private config: PaguiConfig;

  constructor(config: PaguiConfig) {
    this.config = config;
  }

  /**
   * Genera un QR de pago
   */
  async generarQR(params: {
    transactionId: string;
    amount: number;
    description: string;
    bankId?: number;
    dueDate?: string;
    singleUse?: boolean;
    modifyAmount?: boolean;
  }): Promise<QRGenerationAPIResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        },
        body: JSON.stringify({
          transactionId: params.transactionId,
          amount: params.amount,
          description: params.description,
          bankId: params.bankId || 1,
          dueDate: params.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          singleUse: params.singleUse || false,
          modifyAmount: params.modifyAmount || false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API QR error: ${response.status} - ${errorData.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generando QR:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado de un QR
   */
  async verificarEstadoQR(qrId: string): Promise<QRStatusAPIResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/qr/${qrId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API QR Status error: ${response.status} - ${errorData.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verificando estado QR:', error);
      throw error;
    }
  }

  /**
   * Cancela un QR
   */
  async cancelarQR(qrId: string): Promise<QRCancellationAPIResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/qr/${qrId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API QR Cancel error: ${response.status} - ${errorData.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error cancelando QR:', error);
      throw error;
    }
  }

  /**
   * Obtiene los pagos de un QR específico
   */
  async obtenerPagosQR(qrId: string): Promise<QRPaymentsAPIResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/qr/${qrId}/payments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API QR Payments error: ${response.status} - ${errorData.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error obteniendo pagos QR:', error);
      throw error;
    }
  }

  /**
   * Crea una instancia de PaguiAPI para una empresa específica
   */
  static createForEmpresa(empresaSlug: string, config: PaguiConfig): PaguiAPI {
    return new PaguiAPI(config);
  }
}
