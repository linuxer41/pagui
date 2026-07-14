import fetch from 'node-fetch'
import type { BankAdapter } from './bank-adapter.interface'
import { BANECO_AuthResponseSchema, BANECO_QRGenerateResponseSchema, BANECO_QRStatusResponseSchema, BANECO_PaidQRResponseSchema } from '../../common/baneco.schema'
import { Static } from '@sinclair/typebox'

export class BanecoAdapter implements BankAdapter {
  private apiBaseUrl: string
  private aesKey: string

  constructor(apiBaseUrl: string, aesKey: string) {
    this.apiBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
    this.aesKey = aesKey
  }

  private async encryptText(text: string, aesKey?: string): Promise<string> {
    const key = aesKey || this.aesKey
    const url = `${this.apiBaseUrl}api/authentication/encrypt?text=${encodeURIComponent(text)}&aesKey=${key}`
    const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) throw new Error(`Encrypt error: ${await res.text()}`)
    return res.json() as Promise<string>
  }

  async getToken(username: string, passwordPlain: string): Promise<string> {
    const encryptedPassword = await this.encryptText(passwordPlain)
    const res = await fetch(`${this.apiBaseUrl}api/authentication/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: username, password: encryptedPassword }),
    })
    if (!res.ok) throw new Error(`Auth error: ${await res.text()}`)
    const data = await res.json() as unknown as Static<typeof BANECO_AuthResponseSchema>
    if (data.responseCode !== 0) throw new Error(`Auth error: ${data.message}`)
    return data.token
  }

  async generateQr(
    token: string, transactionId: string, accountNumber: string, amount: number,
    options: { description?: string; dueDate?: string; singleUse?: boolean; modifyAmount?: boolean; currency?: string } = {}
  ): Promise<{ qrId: string; qrImage: string; reference: string }> {
    const encryptedAccount = await this.encryptText(accountNumber)
    const res = await fetch(`${this.apiBaseUrl}api/qrsimple/generateQR`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    if (!res.ok) throw new Error(`QR generate error: ${await res.text()}`)
    const data = await res.json() as unknown as Static<typeof BANECO_QRGenerateResponseSchema>
    if (data.responseCode !== 0) throw new Error(`QR generate error: ${data.message}`)
    return { qrId: data.qrId, qrImage: data.qrImage, reference: data.reference }
  }

  async cancelQr(token: string, qrId: string): Promise<void> {
    const res = await fetch(`${this.apiBaseUrl}api/qrsimple/cancelQR`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ qrId }),
    })
    if (!res.ok) throw new Error(`Cancel error: ${await res.text()}`)
    const data = await res.json() as any
    if (data.responseCode !== 0) throw new Error(`Cancel error: ${data.message}`)
  }

  async getQrStatus(token: string, qrId: string): Promise<{ status: string; amount: number; currency: string; description: string; qrImage: string }> {
    const res = await fetch(`${this.apiBaseUrl}api/qrsimple/v2/statusQR/${qrId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Status error: ${await res.text()}`)
    const data = await res.json() as unknown as Static<typeof BANECO_QRStatusResponseSchema>
    if (data.responseCode !== 0) throw new Error(`Status error: ${data.message}`)
    return { status: data.status, amount: data.amount, currency: data.currency, description: data.description, qrImage: data.qrImage }
  }

  async getPaidQrsByDate(token: string, dateStr: string): Promise<Array<{ qrId: string; transactionId: string; amount: number; currency: string; paymentDate: string; paymentHour: string }>> {
    const res = await fetch(`${this.apiBaseUrl}api/qrsimple/v2/paidQR/${dateStr}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as unknown as Static<typeof BANECO_PaidQRResponseSchema>
    if (!res.ok || data.responseCode !== 0) throw new Error(`Paid QR error: ${data.message}`)
    return data.paymentList || []
  }
}
