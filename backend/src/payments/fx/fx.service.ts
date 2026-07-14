import { query } from '../../shared/database/pool'
import { nextSnowflake } from '../../shared/snowflake'
import { logger } from '../../shared/logger'

const SUPPORTED_CURRENCIES = ['BOB', 'USD', 'EUR', 'BRL', 'ARS', 'CLP', 'PEN', 'COP']

export async function getRate(base: string, target: string): Promise<number | null> {
  const result = await query(
    `SELECT rate FROM fx_rates
     WHERE base_currency = $1 AND target_currency = $2
       AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
       AND valid_from <= CURRENT_TIMESTAMP
     ORDER BY valid_from DESC LIMIT 1`,
    [base.toUpperCase(), target.toUpperCase()]
  )
  if (result.rows.length === 0) return null
  return parseFloat(result.rows[0].rate)
}

export async function convert(amount: number, from: string, to: string): Promise<{ amount: number; rate: number } | null> {
  if (from === to) return { amount, rate: 1 }
  const rate = await getRate(from, to)
  if (!rate) return null
  return { amount: Math.round(amount * rate * 100) / 100, rate }
}

export async function setRate(base: string, target: string, rate: number, source = 'manual') {
  await query(
    `INSERT INTO fx_rates (id, base_currency, target_currency, rate, source)
     VALUES ($1, $2, $3, $4, $5)`,
    [nextSnowflake(), base.toUpperCase(), target.toUpperCase(), rate, source]
  )
  logger.info('FX rate updated', { base, target, rate, source })
}

export async function getAllRates() {
  const result = await query(
    `SELECT DISTINCT ON (base_currency, target_currency)
       base_currency, target_currency, rate, source, valid_from
     FROM fx_rates
     WHERE valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP
     ORDER BY base_currency, target_currency, valid_from DESC`
  )
  return result.rows
}

export async function getSupportedCurrencies() {
  return SUPPORTED_CURRENCIES
}
