import { BaseApiClient, ApiKeyAuthProvider } from '@pagui/shared';
import { PAGUI_PUBLIC_API_URL, PAGUI_API_KEY } from '$env/static/private';
import type {
	QRGenerationAPIResponse,
	QRStatusAPIResponse,
	QRCancellationAPIResponse,
	QRPaymentsAPIResponse,
	PaymentData
} from '../types/api';

const DEFAULT_API_URL = PAGUI_PUBLIC_API_URL || 'http://localhost:3001';
const DEFAULT_API_KEY = PAGUI_API_KEY || '';

// La public API devuelve los movimientos en snake_case (filas de wallet_movements);
// el frontend espera el shape camelCase de PaymentData.
const asText = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

function normalizePayment(row: PaymentData): PaymentData {
	const r = row as unknown as Record<string, unknown>;
	if (r.senderName !== undefined) return row;
	return {
		qrId: asText(r.qr_id),
		transactionId: asText(r.transaction_id),
		paymentDate: asText(r.payment_date ?? r.created_at),
		paymentTime: asText(r.payment_hour),
		currency: asText(r.currency) || 'BOB',
		amount: Number(r.amount ?? 0),
		senderBankCode: asText(r.sender_bank_code),
		senderName: asText(r.sender_name),
		senderDocumentId: asText(r.sender_document_id),
		senderAccount: asText(r.sender_account),
		description: asText(r.description)
	};
}

export class QRService extends BaseApiClient {
	constructor(baseUrl?: string, apiKey?: string) {
		const resolvedBaseUrl = baseUrl || DEFAULT_API_URL;
		const resolvedApiKey = apiKey || DEFAULT_API_KEY;
		super(resolvedBaseUrl, new ApiKeyAuthProvider(resolvedApiKey));
	}

	static create(baseUrl?: string, apiKey?: string): QRService {
		return new QRService(baseUrl, apiKey);
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
			dueDate: dueDate.toISOString(),
			singleUse: false,
			modifyAmount: false
		});
	}

	async verificarEstadoQR(qrId: string): Promise<QRStatusAPIResponse> {
		const result = await this.get<QRStatusAPIResponse>(`/qr/${qrId}`);
		if (result?.data?.payments) {
			result.data.payments = result.data.payments.map(normalizePayment);
		}
		return result;
	}

	async cancelarQR(qrId: string): Promise<QRCancellationAPIResponse> {
		return this.delete<QRCancellationAPIResponse>(`/qr/${qrId}`);
	}

	async obtenerPagosQR(qrId: string): Promise<QRPaymentsAPIResponse> {
		const result = await this.get<QRPaymentsAPIResponse>(`/qr/${qrId}/payments`);
		if (Array.isArray(result?.data)) {
			result.data = result.data.map(normalizePayment);
		}
		return result;
	}
}

export const defaultQRService = new QRService();
