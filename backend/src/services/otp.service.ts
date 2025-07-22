import { query } from '../config/database';
import { logActivity } from './monitor.service';

// Configuración de la API de UniMTX
const UNIMTX_API_URL = 'https://api.unimtx.com/';
const ACCESS_KEY_ID = process.env.UNIMTX_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY_ID';

class OTPService {
  /**
   * Envía un código OTP al número de teléfono especificado
   * @param phoneNumber - Número de teléfono en formato internacional
   * @param userId - ID del usuario (opcional)
   * @param companyId - ID de la empresa (opcional)
   * @returns Promise con el resultado del envío
   */
  async sendOTP(
    phoneNumber: string, 
    userId?: number, 
    companyId?: number
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${UNIMTX_API_URL}?action=otp.send&accessKeyId=${ACCESS_KEY_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Guardar el intento de envío en la base de datos
      await this.saveOTPAttempt(phoneNumber, 'SENT', userId, companyId);
      
      // Registrar actividad
      if (userId && companyId) {
        await logActivity(
          'OTP_SENT',
          { phoneNumber, userId },
          'INFO',
          companyId,
          userId
        );
      }

      return {
        success: true,
        message: 'OTP enviado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error enviando OTP:', error);
      
      // Guardar el error en la base de datos
      await this.saveOTPAttempt(phoneNumber, 'FAILED', userId, companyId, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        message: 'Error enviando OTP',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verifica un código OTP
   * @param phoneNumber - Número de teléfono
   * @param code - Código OTP a verificar
   * @param userId - ID del usuario (opcional)
   * @param companyId - ID de la empresa (opcional)
   * @returns Promise con el resultado de la verificación
   */
  async verifyOTP(
    phoneNumber: string, 
    code: string, 
    userId?: number, 
    companyId?: number
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${UNIMTX_API_URL}?action=otp.verify&accessKeyId=${ACCESS_KEY_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          code: code
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Guardar el resultado de la verificación
      await this.saveOTPAttempt(phoneNumber, 'VERIFIED', userId, companyId);
      
      // Registrar actividad exitosa
      if (userId && companyId) {
        await logActivity(
          'OTP_VERIFIED',
          { phoneNumber, userId },
          'INFO',
          companyId,
          userId
        );
      }

      return {
        success: true,
        message: 'OTP verificado exitosamente',
        data: data
      };
    } catch (error) {
      console.error('Error verificando OTP:', error);
      
      // Guardar el error en la base de datos
      await this.saveOTPAttempt(phoneNumber, 'VERIFICATION_FAILED', userId, companyId, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        message: 'Error verificando OTP',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Guarda un intento de OTP en la base de datos
   * @param phoneNumber - Número de teléfono
   * @param status - Estado del intento (SENT, VERIFIED, FAILED, etc.)
   * @param userId - ID del usuario (opcional)
   * @param companyId - ID de la empresa (opcional)
   * @param errorMessage - Mensaje de error (opcional)
   */
  private async saveOTPAttempt(
    phoneNumber: string,
    status: string,
    userId?: number,
    companyId?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO auth_tokens 
        (user_id, token_type, token, expires_at, used_times, ip_address, user_agent) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId || null,
          `OTP_${status}`,
          phoneNumber, // Usamos el número de teléfono como token
          new Date(Date.now() + 10 * 60 * 1000), // Expira en 10 minutos
          status === 'VERIFIED' ? 1 : 0, // Si es una verificación exitosa, marcamos como usado
          null,
          errorMessage || null
        ]
      );
    } catch (error) {
      console.error('Error guardando intento de OTP:', error);
    }
  }

  /**
   * Verifica si un número de teléfono tiene intentos recientes
   * @param phoneNumber - Número de teléfono
   * @param minutes - Minutos para considerar como "reciente" (por defecto 5)
   * @returns Promise con el número de intentos recientes
   */
  async getRecentAttempts(phoneNumber: string, minutes: number = 5): Promise<number> {
    try {
      const result = await query(`
        SELECT COUNT(*) as count 
        FROM auth_tokens 
        WHERE token = $1 
        AND token_type LIKE 'OTP_%'
        AND created_at > NOW() - INTERVAL '${minutes} minutes'
        AND deleted_at IS NULL`,
        [phoneNumber]
      );
      
      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      console.error('Error obteniendo intentos recientes:', error);
      return 0;
    }
  }

  /**
   * Limpia intentos antiguos de OTP
   * @param hours - Horas después de las cuales limpiar (por defecto 24)
   */
  async cleanupOldAttempts(hours: number = 24): Promise<void> {
    try {
      await query(`
        UPDATE auth_tokens 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE token_type LIKE 'OTP_%'
        AND created_at < NOW() - INTERVAL '${hours} hours'
        AND deleted_at IS NULL`
      );
    } catch (error) {
      console.error('Error limpiando intentos antiguos:', error);
    }
  }
}

// Exportar una instancia del servicio
const otpService = new OTPService();
export default otpService; 