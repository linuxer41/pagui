import fetch from 'node-fetch'
import type { CollectionProvider, DebtRequest, DebtResponse, TransactionResult } from '../../collection.strategy'

const EMPSAAT_API = process.env.EMPSAAT_API_URL || 'https://api.empsaat.org.bo'
const EMPSAAT_API_KEY = process.env.EMPSAAT_API_KEY || ''

export class EmpsaatProvider implements CollectionProvider {
  getCompanySlug(): string { return 'empsaat' }

  private async request(path: string, options: Record<string, unknown> = {}): Promise<any> {
    const res = await fetch(`${EMPSAAT_API}${path}`, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': EMPSAAT_API_KEY },
      ...options,
    })
    if (!res.ok) throw new Error(`EMPSAAT error: ${await res.text()}`)
    return res.json()
  }

  async queryDebts(request: DebtRequest): Promise<DebtResponse> {
    return this.request(`/deudas?keyword=${encodeURIComponent(request.keyword)}&type=${request.type || 'ci'}`)
  }

  async createTransaction(abonado: string, amount: number, description?: string): Promise<TransactionResult> {
    return this.request(`/deudas/${abonado}/transaction`, {
      method: 'POST',
      body: JSON.stringify({ amount, description: description || `Pago QR ${abonado}` }),
    })
  }

  async completeTransaction(transactionId: string, paymentRef?: string): Promise<TransactionResult> {
    return this.request(`/deudas/transaction/complete`, {
      method: 'POST',
      body: JSON.stringify({ transactionId, paymentRef }),
    })
  }

  async getHistory(abonado: string): Promise<any[]> {
    return this.request(`/deudas/${abonado}/transactions`)
  }
}
