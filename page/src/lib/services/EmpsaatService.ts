import { BaseApiClient, ApiKeyAuthProvider } from '@pagui/shared';
import { EMPSAAT_API_URL, EMPSAAT_API_KEY } from '$env/static/private';
import type { ServerResponse } from '../types/api';
import type {
	DeudasResponse,
	CrearTransaccionRequest,
	CompletarTransaccionRequest,
	TransaccionResponse
} from '../types/empsaat';

const DEFAULT_API_URL = EMPSAAT_API_URL || 'http://localhost:3002';
const DEFAULT_API_KEY = EMPSAAT_API_KEY || '';

/**
 * Servicio de la API de integración EMPSAAT (:3002).
 * Autenticación: header `api-key` (no `X-API-Key`).
 */
export class EmpsaatService extends BaseApiClient {
	constructor(baseUrl?: string, apiKey?: string) {
		const resolvedBaseUrl = baseUrl || DEFAULT_API_URL;
		const resolvedApiKey = apiKey || DEFAULT_API_KEY;
		super(resolvedBaseUrl, new ApiKeyAuthProvider(resolvedApiKey, 'api-key'));
	}

	static create(baseUrl?: string, apiKey?: string): EmpsaatService {
		return new EmpsaatService(baseUrl, apiKey);
	}

	async buscarDeudasPorCriterio(
		keyword: string,
		type: 'nombre' | 'documento' | 'abonado'
	): Promise<ServerResponse<DeudasResponse>> {
		const params = new URLSearchParams({ keyword: keyword.trim(), type });
		return this.get<ServerResponse<DeudasResponse>>(`/deudas?${params}`);
	}

	async crearTransaccion(
		abonado: number,
		datos: CrearTransaccionRequest
	): Promise<ServerResponse<TransaccionResponse>> {
		return this.post<ServerResponse<TransaccionResponse>>(`/deudas/${abonado}/transaction`, datos);
	}

	async completarTransaccion(
		datos: CompletarTransaccionRequest
	): Promise<ServerResponse<TransaccionResponse>> {
		return this.post<ServerResponse<TransaccionResponse>>('/deudas/transaction/complete', datos);
	}

	async obtenerHistorialTransacciones(
		abonado: number
	): Promise<ServerResponse<TransaccionResponse[]>> {
		return this.get<ServerResponse<TransaccionResponse[]>>(`/deudas/${abonado}/transactions`);
	}
}

export const defaultEmpsaatService = new EmpsaatService();
