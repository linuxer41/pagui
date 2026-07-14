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
export class EmpsaatService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || DEFAULT_API_URL
    this.apiKey = apiKey || DEFAULT_API_KEY
  }

  static create(baseUrl?: string, apiKey?: string): EmpsaatService {
    return new EmpsaatService(baseUrl, apiKey)
  }

  private async callApi<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ): Promise<ServerResponse<T>> {
    const response = await fetch(
      `${this.baseUrl}/collections/empsaat${endpoint}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || `Error: ${response.status}`)
    }

    return response.json()
  }

  async buscarDeudasPorCriterio(
    keyword: string,
    type: 'nombre' | 'documento' | 'abonado'
  ): Promise<ServerResponse<DeudasResponse>> {
    const params = new URLSearchParams({ keyword: keyword.trim(), type })
    return this.callApi<DeudasResponse>(`/deudas?${params}`, 'GET')
  }

  async crearTransaccion(
    abonado: number,
    datos: CrearTransaccionRequest
  ): Promise<ServerResponse<TransaccionResponse>> {
    return this.callApi<TransaccionResponse>(
      `/deudas/${abonado}/transaction`,
      'POST',
      datos
    )
  }

  async completarTransaccion(
    datos: CompletarTransaccionRequest
  ): Promise<ServerResponse<TransaccionResponse>> {
    return this.callApi<TransaccionResponse>(
      '/deudas/transaction/complete',
      'POST',
      datos
    )
  }

  async obtenerHistorialTransacciones(
    abonado: number
  ): Promise<ServerResponse<TransaccionResponse[]>> {
    return this.callApi<TransaccionResponse[]>(
      `/deudas/${abonado}/transactions`,
      'GET'
    )
  }
}

export const defaultEmpsaatService = new EmpsaatService()