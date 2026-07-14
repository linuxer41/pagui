import { PUBLIC_PAGUI_API_URL, PUBLIC_PAGUI_API_KEY } from '$env/static/public'
import type { QRGenerationAPIResponse, QRStatusAPIResponse, QRCancellationAPIResponse, QRPaymentsAPIResponse } from '../types/api';

const DEFAULT_API_URL = PUBLIC_PAGUI_API_URL || 'http://localhost:3000'
const DEFAULT_API_KEY = PUBLIC_PAGUI_API_KEY || ''

export class QRService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || DEFAULT_API_URL
    this.apiKey = apiKey || DEFAULT_API_KEY
  }

  static create(baseUrl?: string, apiKey?: string): QRService {
    return new QRService(baseUrl, apiKey)
  }

  private async callPaguiAPI<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error: ${response.status}`);
    }

    return await response.json();
  }

  async generarQR(params: {
    transactionId: string;
    amount: number;
    description: string;
  }): Promise<QRGenerationAPIResponse> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

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

  async verificarEstadoQR(qrId: string): Promise<QRStatusAPIResponse> {
    return this.callPaguiAPI<QRStatusAPIResponse>(`/qr/${qrId}`, 'GET');
  }

  async cancelarQR(qrId: string): Promise<QRCancellationAPIResponse> {
    return this.callPaguiAPI<QRCancellationAPIResponse>(`/qr/${qrId}`, 'DELETE');
  }

  async obtenerPagosQR(qrId: string): Promise<QRPaymentsAPIResponse> {
    return this.callPaguiAPI<QRPaymentsAPIResponse>(`/qr/${qrId}/payments`, 'GET');
  }
}

export const defaultQRService = new QRService()