import { query } from '../shared/database/pool'
import { nextSnowflake } from '../shared/snowflake'
import { generateAccountNumber } from '../banking/account/account-number.service'
import { roleRepository } from '../identity/role.repository'
import { userService } from '../identity/user.service'
import { accountRepository } from '../banking/account/account.repository'
import { walletRepository } from '../payments/wallet/wallet.repository'
import { companyRepository } from '../collections/company/company.repository'
import { feeRepository } from '../payments/fee/fee.repository'
import bcrypt from 'bcrypt'

export async function seedDatabase() {
  console.log('Seeding database...')

  // 1. Roles
  const adminRole = await roleRepository.upsert('admin', 'Administrador del sistema', { all: true })
  const userRole = await roleRepository.upsert('user', 'Usuario estándar', { basic: true })
  const managerRole = await roleRepository.upsert('manager', 'Gerente', { management: true })
  console.log('Roles created')

  // 2. Banks
  const banecoId = nextSnowflake()
  await query(`
    INSERT INTO banks (id, code, name) VALUES ($1, 'BANECO', 'Banco Económico')
    ON CONFLICT (code) DO NOTHING
  `, [banecoId])

  // 3. Bank Credentials
  const testCredId = nextSnowflake()
  const prodCredId = nextSnowflake()
  const iathingsCredId = nextSnowflake()

  const credentials = [
    { id: testCredId, bankId: banecoId, accountNumber: '1041070599', accountName: 'Cuenta Test', merchantId: 'MERCH001', username: 'test_user', password: 'enc_test_pass', encryptionKey: 'enc_test_key', environment: 'test', apiBaseUrl: 'https://apimktdesa.baneco.com.bo/ApiGateway' },
    { id: prodCredId, bankId: banecoId, accountNumber: '5021531650', accountName: 'Cuenta Producción', merchantId: 'MERCH002', username: 'prod_user', password: 'enc_prod_pass', encryptionKey: 'enc_prod_key', environment: 'prod', apiBaseUrl: 'https://apimkt.baneco.com.bo/ApiGateway' },
    { id: iathingsCredId, bankId: banecoId, accountNumber: '5021979319', accountName: 'IATHINGS', merchantId: 'MERCH003', username: 'iathings_user', password: 'enc_iathings_pass', encryptionKey: 'enc_iathings_key', environment: 'prod', apiBaseUrl: 'https://apimkt.baneco.com.bo/ApiGateway' },
  ]

  for (const c of credentials) {
    await query(`
      INSERT INTO bank_credentials (id, bank_id, account_number, account_name, merchant_id, username, password, encryption_key, environment, api_base_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING
    `, [c.id, c.bankId, c.accountNumber, c.accountName, c.merchantId, c.username, c.password, c.encryptionKey, c.environment, c.apiBaseUrl])
  }
  console.log('Bank credentials created')

  // 4. Users
  const users = [
    { email: 'admin@pagui.com', password: 'admin123', fullName: 'Administrador del Sistema', phone: '76543210', address: 'La Paz, Bolivia', roleId: adminRole.id },
    { email: 'usuario@example.com', password: 'usuario123', fullName: 'Usuario Demo', phone: '65432109', address: 'Santa Cruz, Bolivia', roleId: userRole.id },
    { email: 'gerente@example.com', password: 'gerente123', fullName: 'Gerente Demo', phone: '55555555', address: 'Cochabamba, Bolivia', roleId: managerRole.id },
    { email: 'iathings@example.com', password: 'iathings123', fullName: 'IATHINGS EMPRESARIAL', phone: '77777777', address: 'La Paz, Bolivia', roleId: managerRole.id },
  ]

  const createdUsers = []
  for (const u of users) {
    try {
      const user = await userService.create(u)
      createdUsers.push(user)
      console.log(`  User ${u.email} created`)
    } catch (e: any) {
      console.log(`  User ${u.email} skipped: ${e.message}`)
    }
  }

  // 5. Accounts
  const accountConfigs = [
    { accountNumber: '100013101', accountType: 'business', bankCredentialId: prodCredId, userId: createdUsers[0].id },
    { accountNumber: '100011102', accountType: 'current', bankCredentialId: testCredId, userId: createdUsers[1].id },
    { accountNumber: '100013103', accountType: 'business', bankCredentialId: prodCredId, userId: createdUsers[2].id },
    { accountNumber: '100013104', accountType: 'business', bankCredentialId: iathingsCredId, userId: createdUsers[3].id },
  ]

  for (const ac of accountConfigs) {
    const a = await accountRepository.create(ac)
    await accountRepository.linkUser(ac.userId, a.id, 'owner', true)
    console.log(`  Account ${ac.accountNumber} created`)
  }

  // 6. Wallets
  for (const u of createdUsers) {
    await walletRepository.create({ userId: u.id, name: 'Principal', type: 'personal' })
    console.log(`  Wallet for ${u.email} created`)
  }

  // 7. Companies
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
  console.log('Companies created')

  // 8. Fee rules
  await feeRepository.create({ transactionType: 'p2p', feeType: 'percentage', feeValue: 0.5, feeCap: 10, minAmount: 0 })
  await feeRepository.create({ transactionType: 'withdrawal', feeType: 'fixed', feeValue: 2.50 })
  await feeRepository.create({ transactionType: 'topup', feeType: 'percentage', feeValue: 1.0, feeCap: 15 })
  console.log('Fee rules created')

  // 9. API keys
  const storedUsers = await query('SELECT id FROM users WHERE deleted_at IS NULL')
  for (const row of storedUsers.rows) {
    const accounts = await accountRepository.listByUser(row.id)
    if (accounts.length > 0) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let key = 'pg_'
      for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
      await query(`
        INSERT INTO api_keys (id, api_key, account_id, description, permissions, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        ON CONFLICT (api_key) DO NOTHING
      `, [nextSnowflake(), key, accounts[0].id, `API Key ${accounts[0].accountNumber}`, JSON.stringify({ qr_generate: true, qr_status: true, qr_cancel: true })])
    }
  }
  console.log('API keys created')

  console.log('Seed completed')
}
