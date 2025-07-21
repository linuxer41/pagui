import fetch from 'node-fetch';
import {
  BANECO_AuthResponseSchema,
  BANECO_QRGenerateRequestSchema,
  BANECO_QRGenerateResponseSchema,
  BANECO_QRCancelRequestSchema,
  BANECO_QRCancelResponseSchema,
  BANECO_QRStatusResponseSchema,
  BANECO_PaidQRResponseSchema,
} from '../schemas/baneco.scheamas';
import { Static } from '@sinclair/typebox';

/**
 * Cliente API para Banco Económico (Baneco)
 * Implementa las operaciones necesarias para generar y gestionar QRs
 */
export class BanecoApi {
  private apiBaseUrl: string;
  private aesKey: string;

  /**
   * Constructor para el cliente API de Baneco
   * @param apiBaseUrl URL base de la API (ej: https://apimktdesa.baneco.com.bo/ApiGateway)
   * @param aesKey Clave de encriptación proporcionada por el banco
   */
  constructor(apiBaseUrl: string, aesKey: string) {
    this.apiBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
    this.aesKey = aesKey;
  }

  /**
   * Encripta un texto utilizando el servicio de encriptación de Baneco
   * @param text Texto a encriptar
   * @param aesKey Clave AES opcional (si no se proporciona, se usa la del constructor)
   * @returns Texto encriptado
   */
  async encryptText(text: string, aesKey?: string): Promise<string> {
    const key = aesKey || this.aesKey;
    const url = `${this.apiBaseUrl}api/authentication/encrypt?text=${encodeURIComponent(text)}&aesKey=${key}`;
    console.log({url});
    try {
      const res = await fetch(url);
 
      if (!res.ok) {
        throw new Error(`Error al encriptar texto: ${await res.text() || 'Error desconocido'}`);
      }
      const data = await res.json() as string;
      return data;
    } catch (error) {
      console.error('Error en encriptación Baneco:', error);
      throw error;
    }
  }

  /**
   * Obtiene un token de autenticación de Baneco
   * @param username Nombre de usuario
   * @param passwordPlain Contraseña en texto plano
   * @returns Token de autenticación
   */
  async getToken(username: string, passwordPlain: string): Promise<Static<typeof BANECO_AuthResponseSchema>["token"]> {
    try {
      // const encryptedPassword = await this.encryptText(passwordPlain);
      const encryptedPassword = 'zJDKXV7e4eGwVsMaoko3X26URZsqOnS8+GrN7IpMACo=';
      const url = `${this.apiBaseUrl}api/authentication/authenticate`;
      
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userName: username, password: encryptedPassword })
      });
      if (!res.ok) {
        throw new Error(`Error de autenticación: ${await res.text() || 'Error desconocido'}`);
      }
      
      const data = await res.json() as unknown as Static<typeof BANECO_AuthResponseSchema>;
      
      if (data.responseCode !== 0) {
        throw new Error(`Error de autenticación: ${data.message}`);
      }
      
      return data.token;
    } catch (error) {
      console.error('Error obteniendo token Baneco:', error);
      throw error;
    }
  }

  /**
   * Genera un QR para pagos
   * @param token Token de autenticación
   * @param transactionId ID de transacción único
   * @param accountNumber Número de cuenta (será encriptado)
   * @param amount Monto del pago
   * @param options Opciones adicionales
   * @returns Datos del QR generado
   */
  async generateQr(
    token: string, 
    transactionId: string, 
    accountNumber: string, 
    amount: number, 
    options: {
      description?: string;
      dueDate?: string;
      singleUse?: boolean;
      modifyAmount?: boolean;
      branchCode?: string;
      currency?: string;
    } = {}
  ): Promise<Static<typeof BANECO_QRGenerateResponseSchema>> {
    try {
      // const encryptedAccount = await this.encryptText(accountNumber);
      const encryptedAccount = 'BOKX0peo3gNrcyilUO5PhycenJ8Q9enImYSXtJL0ukg=';
      const payload: Static<typeof BANECO_QRGenerateRequestSchema> = {
        transactionId,
        accountCredit: encryptedAccount,
        currency: (options.currency || "BOB") as 'BOB' | 'USD',
        amount,
        description: options.description || "Pago QR",
        dueDate: options.dueDate || "2025-12-31",
        singleUse: options.singleUse !== undefined ? options.singleUse : true,
        modifyAmount: options.modifyAmount !== undefined ? options.modifyAmount : false,
        branchCode: options.branchCode || "E0001"
      };
      
      const res = await fetch(`${this.apiBaseUrl}api/qrsimple/generateQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Error generando QR: ${await res.text() || 'Error desconocido'}`);
      }
      
      const data: Static<typeof BANECO_QRGenerateResponseSchema> = await res.json() as unknown as Static<typeof BANECO_QRGenerateResponseSchema>;
      
      if (data.responseCode !== 0) {
        throw new Error(`Error generando QR: ${data.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error generando QR Baneco:', error);
      throw error;
    }
  }

  /**
   * Cancela un QR generado previamente
   * @param token Token de autenticación
   * @param qrId ID del QR a cancelar
   * @returns Resultado de la cancelación
   */
  async cancelQr(token: string, qrId: string): Promise<Static<typeof BANECO_QRCancelResponseSchema>> {
    try {
      const res = await fetch(`${this.apiBaseUrl}api/qrsimple/cancelQR`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ qrId })
      });
      if (!res.ok) {
        throw new Error(`Error cancelando QR: ${await res.text() || 'Error desconocido'}`);
      }
      
      const data: Static<typeof BANECO_QRCancelResponseSchema> = await res.json() as unknown as Static<typeof BANECO_QRCancelResponseSchema>;
      
      if (data.responseCode !== 0) {
        throw new Error(`Error cancelando QR: ${data.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error cancelando QR Baneco:', error);
      throw error;
    }
  }

  /**
   * Consulta el estado de un QR
   * @param token Token de autenticación
   * @param qrId ID del QR a consultar
   * @returns Estado del QR
   */
  async getQrStatus(token: string, qrId: string): Promise<Static<typeof BANECO_QRStatusResponseSchema>> {
    try {
      const res = await fetch(`${this.apiBaseUrl}api/qrsimple/v2/statusQR/${qrId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Error consultando estado QR: ${await res.text() || 'Error desconocido'}`);
      }
      const data: Static<typeof BANECO_QRStatusResponseSchema> = await res.json() as unknown as Static<typeof BANECO_QRStatusResponseSchema>;
      
      if (data.responseCode !== 0) {
        throw new Error(`Error consultando estado QR: ${data.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error consultando estado QR Baneco:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de QRs pagados en una fecha específica
   * @param token Token de autenticación
   * @param dateStr Fecha en formato yyyyMMdd
   * @returns Lista de pagos realizados
   */
  async getPaidQrsByDate(token: string, dateStr: string): Promise<Static<typeof BANECO_PaidQRResponseSchema>["paymentList"]> {
    try {
      const res = await fetch(`${this.apiBaseUrl}api/qrsimple/v2/paidQR/${dateStr}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data: Static<typeof BANECO_PaidQRResponseSchema> = await res.json() as unknown as Static<typeof BANECO_PaidQRResponseSchema>;
      if (!res.ok) {
        throw new Error(`Error consultando QRs pagados: ${await res.text() || 'Error desconocido'}`);
      }
      if (data.responseCode !== 0) {
        throw new Error(`Error consultando QRs pagados: ${data.message}`);
      }
      
      return data.paymentList || [];
    } catch (error) {
      console.error('Error consultando QRs pagados Baneco:', error);
      throw error;
    }
  }
}

export default BanecoApi; 