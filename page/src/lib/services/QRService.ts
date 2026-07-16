import { BaseApiClient, ApiKeyAuthProvider } from '@pagui/shared'
import { PUBLIC_PAGUI_API_URL, PUBLIC_PAGUI_API_KEY } from '$env/static/public'
import type { QRGenerationAPIResponse, QRStatusAPIResponse, QRCancellationAPIResponse, QRPaymentsAPIResponse } from '../types/api';

const DEFAULT_API_URL = PUBLIC_PAGUI_API_URL || 'http://localhost:3000'
const DEFAULT_API_KEY = PUBLIC_PAGUI_API_KEY || ''

export class QRService extends BaseApiClient {
  constructor(baseUrl?: string, apiKey?: string) {
    const resolvedBaseUrl = baseUrl || DEFAULT_API_URL
    const resolvedApiKey = apiKey || DEFAULT_API_KEY
    super(resolvedBaseUrl, new ApiKeyAuthProvider(resolvedApiKey))
  }

  static create(baseUrl?: string, apiKey?: string): QRService {
    return new QRService(baseUrl, apiKey)
  }

  async generarQR(params: {
    transactionId: string;
    amount: number;
    description: string;
  }): Promise<QRGenerationAPIResponse> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    return this.post<QRGenerationAPIResponse>('/qr/generate', {
      transactionId: params.transactionId,
      amount: params.amount,
      description: params.description,
      bankId: 1,
      dueDate: dueDate.toISOString(),
      singleUse: false,
      modifyAmount: false
    });
  }

  async verificarEstadoQR(qrId: string): Promise<QRStatusAPIResponse> {
    return this.get<QRStatusAPIResponse>(`/qr/${qrId}`);
  }

  async cancelarQR(qrId: string): Promise<QRCancellationAPIResponse> {
    return this.delete<QRCancellationAPIResponse>(`/qr/${qrId}`);
  }

  async obtenerPagosQR(qrId: string): Promise<QRPaymentsAPIResponse> {
    return this.get<QRPaymentsAPIResponse>(`/qr/${qrId}/payments`);
  }
}

export const defaultQRService = new QRService()
