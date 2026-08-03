export interface BankAdapter {
  getToken(username: string, password: string): Promise<string>
  generateQr(
    token: string,
    transactionId: string,
    accountNumber: string,
    amount: number,
    options?: {
      description?: string
      dueDate?: string
      singleUse?: boolean
      modifyAmount?: boolean
      currency?: string
    }
  ): Promise<{ qrId: string; qrImage: string; reference: string }>
  cancelQr(token: string, qrId: string): Promise<void>
  getQrStatus(token: string, qrId: string): Promise<{
    status: string
    amount: number
    currency: string
    description: string
    qrImage: string
    senderName?: string
    senderDocumentId?: string
    senderAccount?: string
    senderBankCode?: string
    paymentDate?: string
    paymentTime?: string
    bankTransactionId?: string
  }>
  getPaidQrsByDate(token: string, dateStr: string): Promise<Array<{
    qrId: string
    transactionId: string
    amount: number
    currency: string
    paymentDate: string
    paymentHour: string
  }>>
}
