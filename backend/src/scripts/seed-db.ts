import { Role } from '@pagui/shared'
import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'
import { generateAccountNumber } from '../banking/account/account-number.service'
import { userService } from '../identity/user.service'
import { accountRepository } from '../banking/account/account.repository'
import { walletRepository } from '../payments/wallet/wallet.repository'
import { companyRepository } from '../collections/company/company.repository'
import { feeRepository } from '../payments/fee/fee.repository'
import { logger } from '../shared/logger'
import bcrypt from 'bcrypt'

export async function seedDatabase() {
  logger.info('Seeding database')

  // 1. Banks
  const banecoId = nextSnowflake()
  await query(`
    INSERT INTO banks (id, code, name) VALUES ($1, 'BANECO', 'Banco Económico')
    ON CONFLICT (code) DO NOTHING
  `, [banecoId])

  // 2. Bank Credentials — Business (PAGUI) + Client (usuarios)
  const businessCredId = nextSnowflake()
  const prodCredId = nextSnowflake()
  const clientCredId = nextSnowflake()

  const credentials = [
    { id: businessCredId, bankId: banecoId, accountNumber: '1041070599', accountName: 'PAGUI Empresarial', merchantId: 'MERCH001', username: '1649710', password: '1234', encryptionKey: '6F09E3167E1D40829207B01041A65B12', environment: 'test', apiBaseUrl: 'https://apimktdesa.baneco.com.bo/ApiGateway', type: 'business', userId: null as number | null, commissionRate: 0 },
    { id: prodCredId, bankId: banecoId, accountNumber: '5021531650', accountName: 'PAGUI Producción', merchantId: 'MERCH002', username: 'prod_user', password: 'enc_prod_pass', encryptionKey: 'enc_prod_key', environment: 'prod', apiBaseUrl: 'https://apimkt.baneco.com.bo/ApiGateway', type: 'business', userId: null as number | null, commissionRate: 0 },
    { id: clientCredId, bankId: banecoId, accountNumber: '5021979319', accountName: 'Cliente Demo', merchantId: 'MERCH003', username: 'client_user', password: 'client_pass', encryptionKey: 'client_key', environment: 'test', apiBaseUrl: 'https://apimktdesa.baneco.com.bo/ApiGateway', type: 'client', userId: null as number | null, commissionRate: 0.01 },
  ]

  for (const c of credentials) {
    await query(`
      INSERT INTO bank_credentials (id, bank_id, account_number, account_name, merchant_id, username, password, encryption_key, environment, api_base_url, type, commission_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT DO NOTHING
    `, [c.id, c.bankId, c.accountNumber, c.accountName, c.merchantId, c.username, c.password, c.encryptionKey, c.environment, c.apiBaseUrl, c.type, c.commissionRate])
  }
  logger.info('Bank credentials created')

  // 3. Users (role usa enum Role)
  const users = [
    { email: 'admin@pagui.com', password: 'admin123', fullName: 'Administrador del Sistema', phone: '76543210', address: 'La Paz, Bolivia', role: Role.Super },
    { email: 'usuario@example.com', password: 'usuario123', fullName: 'Usuario Demo', phone: '65432109', address: 'Santa Cruz, Bolivia', role: Role.User },
    { email: 'gerente@example.com', password: 'gerente123', fullName: 'Gerente Demo', phone: '55555555', address: 'Cochabamba, Bolivia', role: Role.Manager },
    { email: 'iathings@example.com', password: 'iathings123', fullName: 'IATHINGS EMPRESARIAL', phone: '77777777', address: 'La Paz, Bolivia', role: Role.Manager },
  ]

  const createdUsers: any[] = []
  for (const u of users) {
    try {
      const user = await userService.create(u)
      createdUsers.push(user)
      logger.info('User created', { email: u.email })
    } catch (e: any) {
      logger.warn('User skipped', { email: u.email, error: e.message })
    }
  }

  // Link client credential to demo user
  if (createdUsers.length > 1) {
    await query(`
      UPDATE bank_credentials SET user_id = $1 WHERE id = $2
    `, [createdUsers[1].id, clientCredId])
  }

  // 4. Accounts — una business (PAGUI) y una client por usuario
  const accountConfigs = [
    { accountNumber: '100013101', accountType: 'business', accountLevel: 'business', accountSubtype: 'administered', bankCredentialId: businessCredId, userId: createdUsers[0].id },
    { accountNumber: '100011102', accountType: 'current', accountLevel: 'client', accountSubtype: 'passthrough', bankCredentialId: clientCredId, userId: createdUsers[1].id },
    { accountNumber: '100013103', accountType: 'business', accountLevel: 'business', accountSubtype: 'administered', bankCredentialId: prodCredId, userId: createdUsers[2].id },
    { accountNumber: '100013104', accountType: 'business', accountLevel: 'client', accountSubtype: 'administered', userId: createdUsers[3].id },
  ]

  for (const ac of accountConfigs) {
    const a = await accountRepository.create({
      accountNumber: ac.accountNumber,
      accountType: ac.accountType,
      accountLevel: ac.accountLevel,
      accountSubtype: ac.accountSubtype,
      bankCredentialId: 'bankCredentialId' in ac ? ac.bankCredentialId : undefined,
      userId: ac.userId,
    })
    await accountRepository.linkUser(ac.userId, a.id, 'owner', true)
    logger.info('Account created', { accountNumber: ac.accountNumber, accountSubtype: ac.accountSubtype })
  }

  // 5. Wallets
  for (const u of createdUsers) {
    await walletRepository.create({ userId: u.id, name: 'Principal', type: 'personal' })
    logger.info('Wallet created', { email: u.email })
  }

  // 6. Companies
  await companyRepository.upsert({
    slug: 'empsaat', name: 'EMPSAAT',
    colors: { primary: '#0047AB', secondary: '#FF6600' },
    permissions: { qr_generate: true, qr_status: true },
    config: { apiUrl: 'https://api.empsaat.org.bo' },
  })
  await companyRepository.upsert({
    slug: 'empresa-b', name: 'Farmacia Salud Total',
    colors: { primary: '#2E7D32', secondary: '#FFC107' },
    permissions: { qr_generate: true, qr_status: true },
  })
  await companyRepository.upsert({
    slug: 'empresa-c', name: 'Taller Mecanico Rapido',
    colors: { primary: '#C62828', secondary: '#424242' },
    permissions: { qr_generate: true, qr_status: true },
  })
  logger.info('Companies created')

  // 7. Fee rules
  await feeRepository.create({ transactionType: 'p2p', feeType: 'percentage', feeValue: 0.5, feeCap: 10, minAmount: 0 })
  await feeRepository.create({ transactionType: 'withdrawal', feeType: 'fixed', feeValue: 2.50 })
  await feeRepository.create({ transactionType: 'topup', feeType: 'percentage', feeValue: 1.0, feeCap: 15 })
  logger.info('Fee rules created')

  // 8. API keys
  const storedUsers = await query('SELECT id FROM users WHERE deleted_at IS NULL')
  for (const row of storedUsers.rows) {
    const userAccounts = await accountRepository.listByUser(row.id)
    if (userAccounts.length > 0) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let key = 'pg_'
      for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
      await query(`
        INSERT INTO api_keys (id, api_key, account_id, description, permissions, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        ON CONFLICT (api_key) DO NOTHING
      `, [nextSnowflake(), key, userAccounts[0].id, `API Key ${userAccounts[0].accountNumber}`, JSON.stringify({ qr_generate: true, qr_status: true, qr_cancel: true })])
    }
  }
  logger.info('API keys created')

  logger.info('Seed completed')
}
