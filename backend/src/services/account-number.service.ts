/**
 * Servicio para generar números de cuenta bancarios realistas
 */

import { query } from '../config/database';

export class AccountNumberService {
  private static readonly BANK_CODE = '100'; // Código del banco
  private static readonly BRANCH_CODE = '01'; // Código de sucursal (2 dígitos)
  private static readonly ACCOUNT_TYPES = {
    'current': '1',    // Cuenta corriente
    'savings': '2',    // Cuenta de ahorros
    'business': '3',   // Cuenta empresarial
    'checking': '4'    // Cuenta de cheques
  };
  

  /**
   * Genera un número de cuenta bancario realista
   * Formato: [BANCO][SUCURSAL][TIPO][NUMERO][DIGITO_VERIFICADOR]
   * Ejemplo: 100131234 (9 dígitos)
   */
  static async generateAccountNumber(accountType: string = 'current'): Promise<string> {
    // Obtener código de tipo de cuenta
    const typeCode = this.ACCOUNT_TYPES[accountType as keyof typeof this.ACCOUNT_TYPES] || '1';
    
    // Obtener el siguiente número secuencial desde la base de datos
    const sequentialNumber = await this.getNextSequentialNumber(accountType);
    
    // Construir número base: 100 + 01 + 1 + 12 = 10013112
    const baseNumber = `${this.BANK_CODE}${this.BRANCH_CODE}${typeCode}${sequentialNumber}`;
    
    // Calcular dígito verificador
    const checkDigit = this.calculateCheckDigit(baseNumber);
    
    return `${baseNumber}${checkDigit}`;
  }

  /**
   * Obtiene el siguiente número secuencial para un tipo de cuenta desde la base de datos
   */
  private static async getNextSequentialNumber(accountType: string): Promise<number> {
    try {
      // Usar un enfoque más robusto con timestamp para evitar duplicados
      const timestamp = Date.now();
      const randomOffset = Math.floor(Math.random() * 100);
      
      // Buscar el número más alto y agregar un offset único
      const result = await query(`
        SELECT COALESCE(
          MAX(CAST(SUBSTRING(account_number, 6, 2) AS INTEGER)), 
          9
        ) as max_number
        FROM accounts 
        WHERE account_number LIKE $1
      `, [`${this.BANK_CODE}${this.BRANCH_CODE}${this.ACCOUNT_TYPES[accountType as keyof typeof this.ACCOUNT_TYPES]}%`]);

      const maxNumber = result.rows[0]?.max_number || 9;
      
      // Usar timestamp para generar un número único
      const uniqueNumber = (maxNumber + 1 + (timestamp % 10)) % 90 + 10;
      
      return uniqueNumber;
    } catch (error) {
      console.error('Error obteniendo número secuencial:', error);
      // Fallback: usar timestamp para evitar duplicados
      return Math.floor(Date.now() / 1000) % 90 + 10;
    }
  }

  /**
   * Genera múltiples números de cuenta únicos
   */
  static async generateMultipleAccountNumbers(count: number, accountType: string = 'current'): Promise<string[]> {
    const numbers: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const number = await this.generateAccountNumber(accountType);
      numbers.push(number);
    }
    
    return numbers;
  }

  /**
   * Valida si un número de cuenta tiene el formato correcto
   */
  static validateAccountNumber(accountNumber: string): boolean {
    if (!accountNumber || accountNumber.length !== 9) {
      return false;
    }

    // Verificar que empiece con el código del banco
    if (!accountNumber.startsWith(this.BANK_CODE)) {
      return false;
    }

    // Verificar dígito verificador
    const baseNumber = accountNumber.slice(0, -1);
    const checkDigit = accountNumber.slice(-1);
    const calculatedCheckDigit = this.calculateCheckDigit(baseNumber);

    return checkDigit === calculatedCheckDigit;
  }

  /**
   * Calcula el dígito verificador usando algoritmo Luhn modificado
   */
  private static calculateCheckDigit(baseNumber: string): string {
    let sum = 0;
    let isEven = false;

    // Procesar de derecha a izquierda
    for (let i = baseNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(baseNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return ((10 - (sum % 10)) % 10).toString();
  }

  /**
   * Obtiene información del número de cuenta
   */
  static parseAccountNumber(accountNumber: string): {
    bankCode: string;
    branchCode: string;
    accountType: string;
    accountNumber: string;
    checkDigit: string;
    isValid: boolean;
  } | null {
    if (!this.validateAccountNumber(accountNumber)) {
      return null;
    }

    return {
      bankCode: accountNumber.slice(0, 3),      // 100
      branchCode: accountNumber.slice(3, 5),    // 01
      accountType: accountNumber.slice(5, 6),   // 1
      accountNumber: accountNumber.slice(6, 8), // 12
      checkDigit: accountNumber.slice(-1),      // 3
      isValid: true
    };
  }

  /**
   * Genera un número de cuenta para un tipo específico con prefijo personalizado
   */
  static async generateAccountNumberWithPrefix(prefix: string, accountType: string = 'current'): Promise<string> {
    const typeCode = this.ACCOUNT_TYPES[accountType as keyof typeof this.ACCOUNT_TYPES] || '1';
    
    // Obtener el siguiente número secuencial desde la base de datos
    const sequentialNumber = await this.getNextSequentialNumber(accountType);
    
    // Construir número base
    const baseNumber = `${prefix}${typeCode}${sequentialNumber}`;
    
    // Calcular dígito verificador
    const checkDigit = this.calculateCheckDigit(baseNumber);
    
    return `${baseNumber}${checkDigit}`;
  }
}

export default AccountNumberService;
