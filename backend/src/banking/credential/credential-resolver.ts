import { query } from '../../shared/database/pool'

export type BanecoEnv = 'prod' | 'sandbox'

export interface ResolvedCredential {
  api_base_url: string
  encryption_key: string
  username: string
  password: string
  account_number: string
  environment: BanecoEnv
}

function normalizeEnv(env?: string | null): BanecoEnv {
  return env === 'prod' || env === 'production' ? 'prod' : 'sandbox'
}

function buildFromEnv(env: BanecoEnv = normalizeEnv(process.env.BANECO_ENVIRONMENT || 'prod')): ResolvedCredential {
  const prefix = env === 'prod' ? 'BANECO_PROD' : 'BANECO_SANDBOX'

  const get = (key: string): string => {
    const val = process.env[key]
    if (!val) throw new Error(`Credenciales Baneco no configuradas: falta ${key} en .env`)
    return val
  }

  return {
    api_base_url: get(`${prefix}_API_URL`),
    encryption_key: get(`${prefix}_ENCRYPTION_KEY`),
    username: get(`${prefix}_USERNAME`),
    password: get(`${prefix}_PASSWORD`),
    account_number: get(`${prefix}_ACCOUNT_NUMBER`),
    environment: env,
  }
}

export async function resolveCredentials(
  credentialId?: bigint | null,
  environment?: string | null
): Promise<ResolvedCredential> {
  if (credentialId) {
    const r = await query('SELECT * FROM baneco_credentials WHERE id = $1 AND deleted_at IS NULL', [credentialId])
    if (r.rowCount) {
      const row = r.rows[0] as any
      return {
        api_base_url: row.api_base_url,
        encryption_key: row.encryption_key,
        username: row.username,
        password: row.password,
        account_number: row.account_number,
        environment: normalizeEnv(row.environment),
      }
    }
  }
  return buildFromEnv(normalizeEnv(environment))
}
