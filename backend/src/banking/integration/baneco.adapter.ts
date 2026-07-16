import fetch from 'node-fetch'
import type { BankAdapter } from './bank-adapter.interface'
import { BANECO_AuthResponseSchema, BANECO_QRGenerateResponseSchema, BANECO_QRStatusResponseSchema, BANECO_PaidQRResponseSchema } from '../../common/baneco.schema'
import { Static } from '@sinclair/typebox'
import { AppError } from '../../shared/errors/app-error'

export class BanecoAdapter implements BankAdapter {
  private apiBaseUrl: string
  private aesKey: string

  constructor(apiBaseUrl: string, aesKey: string) {
    this.apiBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
    this.aesKey = aesKey
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiBaseUrl}${path.replace(/^\//, '')}`
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    })
    if (!res.ok) throw new AppError(502, `${path} error: ${await res.text()}`)
    const data = await res.json() as T & { responseCode?: number; message?: string }
    if (data.responseCode !== 0 && data.responseCode !== undefined) {
      throw new AppError(502, `${path} error: ${data.message}`)
    }
    return data
  }

  private async encryptText(text: string, aesKey?: string): Promise<string> {
    const key = aesKey || this.aesKey
    return this.request<string>(`api/authentication/encrypt?text=${encodeURIComponent(text)}&aesKey=${key}`, { method: 'GET' })
  }

  async getToken(username: string, passwordPlain: string): Promise<string> {
    const encryptedPassword = await this.encryptText(passwordPlain)
    const data = await this.request<Static<typeof BANECO_AuthResponseSchema>>('api/authentication/authenticate', {
      method: 'POST',
      body: JSON.stringify({ userName: username, password: encryptedPassword }),
    })
    return data.token
  }

  async generateQr(
    token: string, transactionId: string, accountNumber: string, amount: number,
    options: { description?: string; dueDate?: string; singleUse?: boolean; modifyAmount?: boolean; currency?: string } = {}
  ): Promise<{ qrId: string; qrImage: string; reference: string }> {
    const encryptedAccount = await this.encryptText(accountNumber)
    const data = await this.request<Static<typeof BANECO_QRGenerateResponseSchema>>('api/qrsimple/generateQR', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        transactionId,
        accountCredit: encryptedAccount,
        currency: options.currency || 'BOB',
        amount,
        description: options.description || 'Pago QR',
        dueDate: options.dueDate || '2025-12-31',
        singleUse: options.singleUse !== undefined ? options.singleUse : true,
        modifyAmount: options.modifyAmount !== undefined ? options.modifyAmount : false,
        branchCode: 'E0001',
      }),
    })
    return { qrId: data.qrId, qrImage: data.qrImage, reference: data.reference }
  }

  async cancelQr(token: string, qrId: string): Promise<void> {
    await this.request<Static<typeof BANECO_QRStatusResponseSchema>>('api/qrsimple/cancelQR', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ qrId }),
    })
  }

  async getQrStatus(token: string, qrId: string): Promise<{ status: string; amount: number; currency: string; description: string; qrImage: string }> {
    const data = await this.request<Static<typeof BANECO_QRStatusResponseSchema>>(`api/qrsimple/v2/statusQR/${qrId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    return { status: data.status, amount: data.amount, currency: data.currency, description: data.description, qrImage: data.qrImage }
  }

  async getPaidQrsByDate(token: string, dateStr: string): Promise<Array<{ qrId: string; transactionId: string; amount: number; currency: string; paymentDate: string; paymentHour: string }>> {
    const data = await this.request<Static<typeof BANECO_PaidQRResponseSchema>>(`api/qrsimple/v2/paidQR/${dateStr}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    return data.paymentList || []
  }
}
