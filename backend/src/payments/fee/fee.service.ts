import { feeRepository, type FeeRuleRow } from './fee.repository'

export const feeService = {
  async calculateFee(walletId: bigint, amount: number): Promise<number> {
    const rules = await feeRepository.findByType('p2p')
    return feeRepository.calculateFee(amount, rules)
  },

  async listAll(): Promise<FeeRuleRow[]> {
    return feeRepository.listAll()
  },

  async create(data: Parameters<typeof feeRepository.create>[0]): Promise<FeeRuleRow> {
    return feeRepository.create(data)
  },

  async update(id: bigint, data: Partial<FeeRuleRow>): Promise<void> {
    return feeRepository.update(id, data)
  },
}
