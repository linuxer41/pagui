export interface DebtRequest {
  keyword: string
  type?: string
}

export interface DebtResponse {
  abonado: string
  name: string
  debts: Array<{
    id: string
    description: string
    amount: number
    dueDate: string
    period: string
  }>
}

export interface TransactionResult {
  transactionId: string
  status: string
  amount: number
  message: string
}

export interface CollectionProvider {
  getCompanySlug(): string
  queryDebts(request: DebtRequest): Promise<DebtResponse>
  createTransaction(abonado: string, amount: number, description?: string): Promise<TransactionResult>
  completeTransaction(transactionId: string, paymentRef?: string): Promise<TransactionResult>
  getHistory(abonado: string): Promise<any[]>
}
