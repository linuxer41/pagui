import { BaseApiClient, ApiKeyAuthProvider } from '@pagui/shared'
import { PUBLIC_PAGUI_API_URL, PUBLIC_PAGUI_API_KEY } from '$env/static/public'
import type { ServerResponse } from '../types/api'
import type {
  DeudasResponse,
  CrearTransaccionRequest,
  CompletarTransaccionRequest,
  TransaccionResponse,
} from '../types/empsaat'

const DEFAULT_API_URL = PUBLIC_PAGUI_API_URL || 'http://localhost:3000'
const DEFAULT_API_KEY = PUBLIC_PAGUI_API_KEY || ''

/**
 * Servicio para EMPSAAT
 * Enruta a través del backend Pagui para mantener las API keys seguras.
 */
export class EmpsaatService extends BaseApiClient {
  constructor(baseUrl?: string, apiKey?: string) {
    const resolvedBaseUrl = baseUrl || DEFAULT_API_URL
    const resolvedApiKey = apiKey || DEFAULT_API_KEY
    super(resolvedBaseUrl, new ApiKeyAuthProvider(resolvedApiKey))
  }

  static create(baseUrl?: string, apiKey?: string): EmpsaatService {
    return new EmpsaatService(baseUrl, apiKey)
  }

  async buscarDeudasPorCriterio(
    keyword: string,
    type: 'nombre' | 'documento' | 'abonado'
  ): Promise<ServerResponse<DeudasResponse>> {
    const params = new URLSearchParams({ keyword: keyword.trim(), type })
    return this.get<ServerResponse<DeudasResponse>>(`/collections/empsaat/deudas?${params}`)
  }

  async crearTransaccion(
    abonado: number,
    datos: CrearTransaccionRequest
  ): Promise<ServerResponse<TransaccionResponse>> {
    return this.post<ServerResponse<TransaccionResponse>>(
      `/collections/empsaat/deudas/${abonado}/transaction`,
      datos
    )
  }

  async completarTransaccion(
    datos: CompletarTransaccionRequest
  ): Promise<ServerResponse<TransaccionResponse>> {
    return this.post<ServerResponse<TransaccionResponse>>(
      '/collections/empsaat/deudas/transaction/complete',
      datos
    )
  }

  async obtenerHistorialTransacciones(
    abonado: number
  ): Promise<ServerResponse<TransaccionResponse[]>> {
    return this.get<ServerResponse<TransaccionResponse[]>>(
      `/collections/empsaat/deudas/${abonado}/transactions`
    )
  }
}

export const defaultEmpsaatService = new EmpsaatService()
