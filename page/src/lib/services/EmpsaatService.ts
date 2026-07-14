import type { ServerResponse } from '../types/api'
import type {
  DeudasResponse,
  CrearTransaccionRequest,
  CompletarTransaccionRequest,
  TransaccionResponse,
} from '../types/empsaat'
import type { EmpresaConfig } from '../config/empresas'

/**
 * Servicio para EMPSAAT
 * Ahora enruta a través del backend Pagui para mantener las API keys seguras.
 */
export class EmpsaatService {
  private empresaConfig: EmpresaConfig

  constructor(empresaConfig: EmpresaConfig) {
    this.empresaConfig = empresaConfig
  }

  private async callApi<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ): Promise<ServerResponse<T>> {
    const response = await fetch(
      `${this.empresaConfig.paguiBaseUrl}/collections/empsaat${endpoint}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.empresaConfig.paguiApikey,
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
