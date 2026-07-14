const BANK_CODE = '100'
const BRANCH_CODE = '01'

function luhnCheckDigit(digits: string): number {
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alternate) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    alternate = !alternate
  }
  return (10 - (sum % 10)) % 10
}

const ACCOUNT_TYPE_MAP: Record<string, string> = {
  current: '1', savings: '2', business: '3',
}

export function generateAccountNumber(accountType: string, sequence: number): string {
  const typeCode = ACCOUNT_TYPE_MAP[accountType] || '1'
  const seqStr = sequence.toString().padStart(2, '0').slice(-2)
  const withoutCheck = `${BANK_CODE}${BRANCH_CODE}${typeCode}${seqStr}`
  return withoutCheck + luhnCheckDigit(withoutCheck)
}
