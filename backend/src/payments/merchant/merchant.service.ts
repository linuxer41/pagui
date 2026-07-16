import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { walletRepository } from '../wallet/wallet.repository'
import { transferRepository } from '../transfer/transfer.repository'
import { AppError } from '../../shared/errors/app-error'
import { logger } from '../../shared/logger'

export interface MerchantProfile {
  id: bigint
  userId: bigint
  businessName: string
  businessCategory: string
  taxId: string
  phone: string
  address: string
  commissionRate: number
  isVerified: boolean
  qrStatic: string
}

export async function registerMerchant(params: {
  userId: bigint | string
  businessName: string
  businessCategory: string
  taxId: string
  phone: string
  address?: string
  commissionRate?: number
}) {
  const wallet = await walletRepository.create({
    userId: BigInt(params.userId),
    name: params.businessName,
    type: 'merchant',
    currency: 'BOB',
  })

  const id = nextSnowflake()
  await query(
    `INSERT INTO merchants (id, user_id, wallet_id, business_name, business_category, tax_id, phone, address, commission_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE SET business_name = $4, is_active = TRUE`,
    [id, params.userId, wallet.id, params.businessName, params.businessCategory,
     params.taxId, params.phone, params.address || null, params.commissionRate || 0.5]
  )

  logger.info('Merchant registered', { merchantId: id, businessName: params.businessName })
  return { merchantId: id, walletId: wallet.id }
}

export async function processMerchantPayment(params: {
  merchantId: bigint | string
  customerWalletId: bigint | string
  amount: number
  description?: string
}) {
  const merchant = await query(
    'SELECT * FROM merchants WHERE id = $1 AND is_active = TRUE AND is_verified = TRUE',
    [params.merchantId]
  )
  if (merchant.rows.length === 0) throw new AppError(404, 'Comercio no encontrado o inactivo')

  const m = merchant.rows[0]
  const commission = Math.round(params.amount * parseFloat(m.commission_rate) * 100) / 10000
  const netAmount = params.amount - commission

  const customer = await walletRepository.getById(BigInt(params.customerWalletId))
  if (!customer || customer.availableBalance < params.amount) throw new AppError(400, 'Saldo insuficiente')

  const transfer = await transferRepository.create({
    senderWalletId: BigInt(params.customerWalletId),
    receiverWalletId: m.wallet_id,
    amount: params.amount,
    fee: commission,
    total: params.amount,
    description: params.description || `Pago a ${m.business_name}`,
    referenceType: 'merchant_payment',
  })
  await transferRepository.updateStatus(transfer.id, 'completed')

  await walletRepository.updateBalance(
    BigInt(params.customerWalletId),
    customer.balance - params.amount,
    customer.availableBalance - params.amount
  )

  logger.info('Merchant payment processed', {
    merchantId: params.merchantId,
    amount: params.amount,
    commission,
    netAmount,
    transferId: transfer.id,
  })

  return { transferId: transfer.id, merchantName: m.business_name, amount: params.amount, commission, netAmount }
}

export async function generateMerchantQR(merchantId: bigint | string) {
  const merchant = await query('SELECT * FROM merchants WHERE id = $1', [merchantId])
  if (merchant.rows.length === 0) throw new AppError(404, 'Comercio no encontrado')

  const m = merchant.rows[0]
  const qrData = JSON.stringify({
    type: 'merchant',
    merchantId: String(merchantId),
    businessName: m.business_name,
    walletId: String(m.wallet_id),
  })

  const { default: QRCode } = await import('qrcode')
  const qrImage = await QRCode.toDataURL(qrData)

  return { qrData, qrImage, businessName: m.business_name }
}

export async function listMerchants(userId: bigint | string) {
  const result = await query(
    'SELECT id, user_id, wallet_id, business_name, business_category, tax_id, phone, address, commission_rate, is_verified, is_active, created_at FROM merchants WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

export async function getMerchantById(merchantId: bigint | string) {
  const result = await query(
    'SELECT id, user_id, wallet_id, business_name, business_category, tax_id, phone, address, commission_rate, is_verified, is_active, created_at FROM merchants WHERE id = $1',
    [merchantId]
  )
  return result.rows[0] || null
}
