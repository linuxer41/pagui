import { query } from '../config/database';
import { CryptoService } from './crypto.service';
import { ApiError } from '../utils/error';

export interface BankCredential {
  id: number;
  accountNumber: string;
  accountName: string;
  merchantId: string;
  username: string; // Decrypted for service use
  password: string; // Decrypted for service use
  encryptionKey: string; // Decrypted for service use
  environment: string; // 'test' or 'prod'
  apiBaseUrl: string; // URL base de la API del banco
  status: string;
}

export interface CreateBankCredentialData {
  accountNumber: string;
  accountName: string;
  merchantId: string;
  username: string;
  password: string;
  encryptionKey: string;
  environment: string; // 'test' or 'prod'
  apiBaseUrl: string; // URL base de la API del banco
}

export interface UpdateBankCredentialData {
  accountName?: string;
  merchantId?: string;
  username?: string;
  password?: string;
  encryptionKey?: string;
  environment?: string;
  apiBaseUrl?: string;
  status?: string;
}

export interface BankCredentialFilters {
  environment?: string;
  status?: string;
}

export class BankCredentialsService {
  private cryptoService: CryptoService;
  
  constructor() {
    this.cryptoService = new CryptoService(process.env.ENCRYPTION_KEY || 'default-encryption-key');
  }
  
  // Crear credenciales bancarias
  async create(data: CreateBankCredentialData): Promise<BankCredential> {
    try {
      // Verificar que no existan credenciales duplicadas (mismo entorno + misma cuenta)
      const existingResult = await query(`
        SELECT id FROM third_bank_credentials 
        WHERE environment = $1 AND account_number = $2 AND deleted_at IS NULL
      `, [data.environment, data.accountNumber]);
      
      if (existingResult.rowCount && existingResult.rowCount > 0) {
        throw new ApiError(`Ya existen credenciales para la cuenta ${data.accountNumber} en el entorno ${data.environment}`, 400);
      }
      
      // Encriptar datos sensibles
      const encryptedUsername = await this.cryptoService.encrypt(data.username);
      const encryptedPassword = await this.cryptoService.encrypt(data.password);
      const encryptedEncryptionKey = await this.cryptoService.encrypt(data.encryptionKey);
      
      // Insertar credenciales
      const result = await query(`
        INSERT INTO third_bank_credentials (
          account_number, account_name, merchant_id,
          username, password, encryption_key, environment, api_base_url, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
        RETURNING id
      `, [
        data.accountNumber,
        data.accountName,
        data.merchantId,
        encryptedUsername,
        encryptedPassword,
        encryptedEncryptionKey,
        data.environment,
        data.apiBaseUrl
      ]);
      
      const credentialId = result.rows[0].id;
      
      // Obtener credenciales completas
      const credential = await this.getById(credentialId);
      
      if (!credential) {
        throw new ApiError('Error al crear credenciales', 500);
      }
      
      // Activity logging removed
      
      return credential;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Obtener todas las credenciales
  async getAll(): Promise<BankCredential[]> {
    try {
      const result = await query<BankCredential>(`
        SELECT 
          bc.id, 
          bc.account_number as "accountNumber",
          bc.account_name as "accountName",
          bc.merchant_id as "merchantId", 
          bc.username, 
          bc.password, 
          bc.encryption_key as "encryptionKey",
          bc.environment, 
          bc.api_base_url as "apiBaseUrl",
          bc.status
        FROM third_bank_credentials bc
        WHERE bc.deleted_at IS NULL
        ORDER BY bc.created_at DESC
      `);
      
      if (result.rowCount === 0) {
        return [];
      }
      
      // Desencriptar datos sensibles
      const credentials = result.rows.map(credential => ({
        ...credential,
        username: this.cryptoService.decrypt(credential.username),
        password: this.cryptoService.decrypt(credential.password),
        encryptionKey: this.cryptoService.decrypt(credential.encryptionKey)
      }));
      
      return credentials;
      
    } catch (error) {
      console.error('Error obteniendo credenciales:', error);
      throw new ApiError('Error al obtener credenciales', 500);
    }
  }
  
  // Obtener credenciales por ID
  async getById(id: number): Promise<BankCredential> {
    try {
      const result = await query<BankCredential>(`
        SELECT 
          bc.id, 
          bc.account_number as "accountNumber",
          bc.account_name as "accountName",
          bc.merchant_id as "merchantId", 
          bc.username, 
          bc.password, 
          bc.encryption_key as "encryptionKey",
          bc.environment, 
          bc.api_base_url as "apiBaseUrl",
          bc.status
        FROM third_bank_credentials bc
        WHERE bc.id = $1 AND bc.deleted_at IS NULL
      `, [id]);
      
      console.log('result',result.rows);
      
      const credential = result.rows[0];
      if (!credential) {
        throw new ApiError('Credenciales no encontradas', 404);
      }

      // Desencriptar datos sensibles
      return {
        ...credential,
        username: await this.cryptoService.decrypt(credential.username),
        password: await this.cryptoService.decrypt(credential.password),
        encryptionKey: await this.cryptoService.decrypt(credential.encryptionKey)
      } as BankCredential;
      
    } catch (error) {
      throw error;
    }
  }

  
  // Actualizar credenciales
  async update(id: number, data: UpdateBankCredentialData): Promise<BankCredential> {
    try {
      const credential = await this.getById(id);
      
      if (!credential) {
        throw new ApiError('Credenciales no encontradas', 404);
      }
      
      // Construir query de actualización
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCount = 0;
      
      if (data.accountName !== undefined) {
        paramCount++;
        updateFields.push(`account_name = $${paramCount}`);
        params.push(data.accountName);
      }
      
      if (data.merchantId !== undefined) {
        paramCount++;
        updateFields.push(`merchant_id = $${paramCount}`);
        params.push(data.merchantId);
      }
      
      if (data.username !== undefined) {
        paramCount++;
        const encryptedUsername = await this.cryptoService.encrypt(data.username);
        updateFields.push(`username = $${paramCount}`);
        params.push(encryptedUsername);
      }
      
      if (data.password !== undefined) {
        paramCount++;
        const encryptedPassword = await this.cryptoService.encrypt(data.password);
        updateFields.push(`password = $${paramCount}`);
        params.push(encryptedPassword);
      }
      
      if (data.encryptionKey !== undefined) {
        paramCount++;
        const encryptedEncryptionKey = await this.cryptoService.encrypt(data.encryptionKey);
        updateFields.push(`encryption_key = $${paramCount}`);
        params.push(encryptedEncryptionKey);
      }
      
      if (data.status !== undefined) {
        paramCount++;
        updateFields.push(`status = $${paramCount}`);
        params.push(data.status);
      }
      
      if (updateFields.length === 0) {
        throw new ApiError('No hay campos para actualizar', 400);
      }
      
      paramCount++;
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const result = await query(`
        UPDATE third_bank_credentials 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id
      `, [...params, id]);
      
      if (result.rowCount === 0) {
        throw new ApiError('Error al actualizar credenciales', 500);
      }
      
      // Obtener credenciales actualizadas
      const updatedCredential = await this.getById(id);
      
      if (!updatedCredential) {
        throw new ApiError('Error al obtener credenciales actualizadas', 500);
      }
      
      // Activity logging removed
      
      return updatedCredential;
      
    } catch (error) {
      throw error;
    }
  }
  
  
  // Eliminar credenciales (soft delete)
  async delete(id: number): Promise<boolean> {
    try {
      const credential = await this.getById(id);
      
      if (!credential) {
        throw new ApiError('Credenciales no encontradas', 404);
      }
      
      const result = await query(`
        UPDATE third_bank_credentials 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount === 0) {
        throw new ApiError('Error al eliminar credenciales', 500);
      }
      
      // Activity logging removed
      
      return true;
      
    } catch (error) {
      throw error;
    }
  }
}

export const bankCredentialsService = new BankCredentialsService();
