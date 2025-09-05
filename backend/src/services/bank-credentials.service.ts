import { query } from '../config/database';
import { CryptoService } from './crypto.service';
import { ApiError } from '../utils/error';
import { logActivity } from './monitor.service';

export interface BankCredential {
  id: number;
  accountNumber: string;
  accountType: number;
  accountName: string;
  merchantId: string;
  username: string; // Decrypted for service use
  password: string; // Decrypted for service use
  encryptionKey: string; // Decrypted for service use
  environment: number;
  apiBaseUrl: string; // URL base de la API del banco
  status: string;
}

export interface CreateBankCredentialData {
  accountNumber: string;
  accountType: number;
  accountName: string;
  merchantId: string;
  username: string;
  password: string;
  encryptionKey: string;
  environment: number;
  apiBaseUrl: string; // URL base de la API del banco
  bankBranch?: string;
}

export interface UpdateBankCredentialData {
  accountName?: string;
  merchantId?: string;
  username?: string;
  password?: string;
  encryptionKey?: string;
  bankBranch?: string;
  status?: string;
}

export interface BankCredentialFilters {
  environment?: number;
  status?: string;
  accountType?: number;
}

export class BankCredentialsService {
  private cryptoService: CryptoService;
  
  constructor() {
    this.cryptoService = new CryptoService(process.env.ENCRYPTION_KEY || 'default-encryption-key');
  }
  
  // Crear credenciales bancarias (solo para configuración inicial del sistema)
  async create(data: CreateBankCredentialData): Promise<BankCredential> {
    try {
      // Verificar que no existan credenciales para este entorno
      const existingResult = await query(`
        SELECT id FROM third_bank_credentials 
        WHERE environment = $1 AND deleted_at IS NULL
      `, [data.environment]);
      
      if (existingResult.rowCount && existingResult.rowCount > 0) {
        throw new ApiError('Ya existen credenciales para este entorno', 400);
      }
      
      // Encriptar datos sensibles
      const encryptedUsername = await this.cryptoService.encrypt(data.username);
      const encryptedPassword = await this.cryptoService.encrypt(data.password);
      const encryptedEncryptionKey = await this.cryptoService.encrypt(data.encryptionKey);
      
      // Insertar credenciales
      const result = await query(`
        INSERT INTO third_bank_credentials (
          account_number, account_type, account_name, merchant_id,
          username, password, encryption_key, environment, api_base_url, bank_branch, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
        RETURNING id
      `, [
        data.accountNumber,
        data.accountType,
        data.accountName,
        data.merchantId,
        encryptedUsername,
        encryptedPassword,
        encryptedEncryptionKey,
        data.environment,
        data.apiBaseUrl,
        data.bankBranch || null
      ]);
      
      const credentialId = result.rows[0].id;
      
      // Obtener credenciales completas
      const credential = await this.getByUserId(credentialId);
      
      if (!credential) {
        throw new ApiError('Error al crear credenciales', 500);
      }
      
      // Registrar actividad (opcional durante seed)
      try {
        await logActivity(
          'third_bank_credentials_CREATED',
          {
            credentialId: credential.id,
            environment: credential.environment,
            accountNumber: credential.accountNumber
          },
          'info',
          1 // System user ID
        );
      } catch (error) {
        // Ignorar errores de log durante seed
        console.log('⚠️  No se pudo registrar actividad (posiblemente durante seed)');
      }
      
      return credential;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Obtener credenciales por ID
  async getById(id: number): Promise<BankCredential> {
    try {
      const result = await query<BankCredential>(`
        SELECT 
          bc.id, 
          bc.account_number as "accountNumber",
          bc.account_type as "accountType", 
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
  async getByUserId(userId: number): Promise<BankCredential> {
    try {
      const result = await query<BankCredential>(`
        SELECT 
          bc.id, 
          bc.account_number as "accountNumber",
          bc.account_type as "accountType", 
          bc.account_name as "accountName",
          bc.merchant_id as "merchantId", 
          bc.username, 
          bc.password, 
          bc.encryption_key as "encryptionKey",
          bc.environment, 
          bc.api_base_url as "apiBaseUrl",
          bc.status
        FROM third_bank_credentials bc
        INNER JOIN users u ON u.third_bank_credential_id = bc.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `, [userId]);
      const credential = result.rows[0];
      if (!credential) {
        throw new ApiError('Credenciales no encontradas', 404);
      }

      if( credential.status !== 'active') {
        throw new ApiError('Credenciales no activas', 400);
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
      
      if (data.bankBranch !== undefined) {
        paramCount++;
        updateFields.push(`bank_branch = $${paramCount}`);
        params.push(data.bankBranch);
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
      
      // Registrar actividad (opcional durante seed)
      try {
        await logActivity(
          'third_bank_credentials_UPDATED',
          {
            credentialId: credential.id,
            environment: credential.environment,
            updatedFields: Object.keys(data)
          },
          'info',
          1 // System user ID
        );
      } catch (error) {
        // Ignorar errores de log durante seed
        console.log('⚠️  No se pudo registrar actividad (posiblemente durante seed)');
      }
      
      return updatedCredential;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Actualizar estado de credenciales
  async updateStatus(id: number, status: string): Promise<BankCredential> {
    try {
      return await this.update(id, { status });
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
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount === 0) {
        throw new ApiError('Error al eliminar credenciales', 500);
      }
      
      // Registrar actividad (opcional durante seed)
      try {
        await logActivity(
          'third_bank_credentials_DELETED',
          {
            credentialId: credential.id,
            environment: credential.environment,
            accountNumber: credential.accountNumber
          },
          'info',
          1 // System user ID
        );
      } catch (error) {
        // Ignorar errores de log durante seed
        console.log('⚠️  No se pudo registrar actividad (posiblemente durante seed)');
      }
      
      return true;
      
    } catch (error) {
      throw error;
    }
  }
}

export const bankCredentialsService = new BankCredentialsService();
