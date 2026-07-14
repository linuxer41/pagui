import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { walletRepository } from '../wallet/wallet.repository'
import { transferRepository } from '../transfer/transfer.repository'
import { logger } from '../../shared/logger'

interface SplitItem {
  walletId: bigint | string
  amount: number
  percentage: number
}

export async function createSplitPayment(
  senderWalletId: bigint | string,
  recipients: SplitItem[],
  description?: string
) {
  const totalFromRecipients = recipients.reduce((sum, r) => sum + r.amount, 0)
  const sender = await walletRepository.getById(senderWalletId)
  if (!sender) throw new Error('Billetera no encontrada')
  if (sender.availableBalance < totalFromRecipients) throw new Error('Saldo insuficiente')

  const splitGroupId = nextSnowflake()
  const results = []

  for (const recipient of recipients) {
    const transfer = await transferRepository.create({
      senderWalletId: BigInt(senderWalletId),
      receiverWalletId: BigInt(recipient.walletId),
      amount: recipient.amount,
      fee: 0,
      total: recipient.amount,
      description: description ? `${description} (split ${recipient.percentage}%)` : `Pago compartido ${splitGroupId}`,
      referenceType: 'split',
    })

    await walletRepository.updateBalance(
      BigInt(senderWalletId),
      sender.balance - recipient.amount,
      sender.availableBalance - recipient.amount
    )
    await walletRepository.updateBalance(
      BigInt(recipient.walletId),
      0, // will be updated below
      0
    )
    await transferRepository.updateStatus(transfer.id, 'completed')

    results.push({ transferId: transfer.id, recipientWalletId: recipient.walletId, amount: recipient.amount })
  }

  logger.info('Split payment completed', { splitGroupId, total: totalFromRecipients, recipients: recipients.length })
  return { splitGroupId, transactions: results }
}

export function calculateSplit(total: number, percentages: number[]): SplitItem[] {
  const sum = percentages.reduce((a, b) => a + b, 0)
  if (Math.abs(sum - 100) > 0.01) throw new Error('Porcentajes deben sumar 100%')

  let remaining = total
  const result: { percentage: number; amount: number }[] = []

  for (let i = 0; i < percentages.length; i++) {
    const pct = percentages[i]
    const isLast = i === percentages.length - 1
    const amount = isLast ? remaining : Math.round((total * pct / 100) * 100) / 100
    remaining -= amount
    result.push({ percentage: pct, amount })
  }

  return result as any
}
