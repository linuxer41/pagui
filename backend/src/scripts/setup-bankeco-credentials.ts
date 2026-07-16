import { query } from '../shared/database/pool'
import { bankCredentialRepository } from '../banking/credential/bank-credential.repository'
import { logger } from '../shared/logger'

export async function setupBanecoCredentials() {
  try {
    logger.info('Setting up Banco Económico credentials')

    const existing = await bankCredentialRepository.list()
    for (const cred of existing) {
      await query('UPDATE bank_credentials SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [cred.id])
    }
    logger.info('Existing credentials removed')

    const testCredential = await bankCredentialRepository.create({
      bankId: 0n, accountNumber: '1041070599',
      accountName: 'Cuenta Test Banco Económico',
      merchantId: 'BANECO_TEST_MERCHANT',
      username: '1649710', password: '1234',
      encryptionKey: '6F09E3167E1D40829207B01041A65B12',
      environment: 'test',
      apiBaseUrl: 'https://apimktdesa.baneco.com.bo/ApiGateway/',
    })
    logger.info('Test credentials created', { id: testCredential.id })

    const prodCredential = await bankCredentialRepository.create({
      bankId: 0n, accountNumber: '5021531650',
      accountName: 'Cuenta Producción Banco Económico',
      merchantId: 'BANECO_PROD_MERCHANT',
      username: 'A96661050', password: 'Anarkia41?',
      encryptionKey: '320A7492A2334CDDADD8230D251B917C',
      environment: 'prod',
      apiBaseUrl: 'https://apimkt.baneco.com.bo/ApiGateway/',
    })
    logger.info('Prod credentials created', { id: prodCredential.id })

    const iathingsCredential = await bankCredentialRepository.create({
      bankId: 0n, accountNumber: '5021979319',
      accountName: 'IATHINGS BANECO',
      merchantId: 'IATHINGS_MERCHANT',
      username: 'A100874750', password: 'Anarkia41?',
      encryptionKey: 'AEA5CA5D649B47D0A16B95CB28C4DC1B',
      environment: 'prod',
      apiBaseUrl: 'https://apimkt.baneco.com.bo/ApiGateway/',
    })
    logger.info('IATHINGS credentials created', { id: iathingsCredential.id })

    return { testCredential, prodCredential, iathingsCredential }
  } catch (error) {
    logger.error('Error setting up Baneco credentials', { error: String(error) })
    throw error
  }
}

if (import.meta.main) {
  setupBanecoCredentials()
    .then(() => { logger.info('Done'); process.exit(0) })
    .catch((e) => { logger.error(String(e)); process.exit(1) })
}
