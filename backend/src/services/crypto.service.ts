import crypto from 'crypto';

export class CryptoService {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;
  private iv: Buffer;

  constructor(encryptionKey: string) {
    // Crear una clave de 32 bytes (256 bits) a partir de la clave proporcionada
    this.key = crypto.createHash('sha256')
      .update(String(encryptionKey))
      .digest();
    
    // Para AES, necesitamos un vector de inicialización (IV) de 16 bytes (128 bits)
    this.iv = Buffer.alloc(16, 0); // IV simplificado para demostración
  }

  /**
   * Encripta un texto utilizando AES-256-CBC
   * @param text Texto a encriptar
   * @param customKey Clave personalizada opcional
   * @returns Texto encriptado en formato Base64
   */
  encrypt(text: string, customKey?: string): string {
    try {
      // Si se proporciona una clave personalizada, usarla en lugar de la predeterminada
      const key = customKey 
        ? crypto.createHash('sha256').update(String(customKey)).digest() 
        : this.key;
      
      const cipher = crypto.createCipheriv(this.algorithm, key, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      console.error('Error en encriptación:', error);
      throw new Error('Error en proceso de encriptación');
    }
  }

  /**
   * Desencripta un texto encriptado con AES-256-CBC
   * @param encryptedText Texto encriptado en formato Base64
   * @param customKey Clave personalizada opcional
   * @returns Texto desencriptado
   */
  decrypt(encryptedText: string, customKey?: string): string {
    try {
      // Si se proporciona una clave personalizada, usarla en lugar de la predeterminada
      const key = customKey 
        ? crypto.createHash('sha256').update(String(customKey)).digest() 
        : this.key;
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, this.iv);
      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Error en desencriptación:', error);
      throw new Error('Error en proceso de desencriptación');
    }
  }
}

// Instancia con clave predeterminada para retrocompatibilidad
const cryptoService = new CryptoService(process.env.CRYPTO_KEY || 'default-encryption-key');

export default cryptoService; 