import { query, generateApiKey } from '../config/database';

interface ApiKeyPermissions {
  qr_generate: boolean;
  qr_status: boolean;
  qr_cancel: boolean;
}

interface ApiKeyResponse {
  id?: number;
  apiKey?: string;
  description?: string;
  permissions?: ApiKeyPermissions;
  userId?: number;
  expiresAt?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  responseCode: number;
  message: string;
}

class ApiKeyService {
  
  // Verificar si una API key es válida
  async verifyApiKey(apiKey: string): Promise<{
    isValid: boolean;
    userId?: number;
    bankCredentialId?: number;
    permissions?: ApiKeyPermissions;
  }> {
    try {
      const result = await query(`
        SELECT 
          ak.id, 
          ak.user_id as "userId", 
          ak.permissions, 
          ak.expires_at as "expiresAt", 
          ak.status,
          u.third_bank_credential_id as "bankCredentialId"
        FROM api_keys ak
        INNER JOIN users u ON ak.user_id = u.id
        WHERE ak.api_key = $1 AND ak.deleted_at IS NULL
      `, [apiKey]);
      
      if (result.rowCount === 0) {
        return { isValid: false };
      }
      
      const apiKeyData = result.rows[0];
      
      // Verificar que la API key esté activa
      if (apiKeyData.status !== 'active') {
        return { isValid: false };
      }
      
      // Verificar que no haya expirado
      if (apiKeyData.expiresAt && new Date() > new Date(apiKeyData.expiresAt)) {
        // Marcar como expirada en la base de datos
        await query(`
          UPDATE api_keys
          SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [apiKeyData.id]);
        
        return { isValid: false };
      }
      
      // API key válida
      return {
        isValid: true,
        userId: apiKeyData.userId,
        bankCredentialId: apiKeyData.bankCredentialId,
        permissions: apiKeyData.permissions
      };
    } catch (error) {
      console.error('Error verificando API key:', error);
      return { isValid: false };
    }
  }
  
  // Verificar si la API key tiene el permiso específico
  async hasPermission(apiKey: string, permission: keyof ApiKeyPermissions): Promise<boolean> {
    const verification = await this.verifyApiKey(apiKey);
    
    if (!verification.isValid || !verification.permissions) {
      return false;
    }
    
    return verification.permissions[permission] === true;
  }
  
  // Generar una nueva API key
  async generateApiKey(
    userId: number,
    description: string,
    permissions: ApiKeyPermissions,
    expiresAt?: string | null,
    createdByUserId?: number
  ): Promise<ApiKeyResponse> {
    try {
      // Verificar que el usuario exista
      const userCheck = await query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
      
      if (userCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Usuario no encontrado'
        };
      }
      
      // Generar una nueva API key
      const apiKey = generateApiKey();
      
      // Guardar en la base de datos
      const result = await query(`
        INSERT INTO api_keys (
          api_key, 
          description, 
          user_id, 
          created_by_user_id,
          permissions, 
          expires_at,
          status
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id, created_at
      `, [
        apiKey,
        description,
        userId,
        createdByUserId || userId,
        JSON.stringify(permissions),
        expiresAt ? new Date(expiresAt) : null
      ]);
      
      // Registrar actividad
      // Activity logging removed
      
      return {
        id: result.rows[0].id,
        apiKey,
        description,
        permissions,
        userId,
        expiresAt,
        status: 'active',
        createdAt: result.rows[0].created_at,
        responseCode: 0,
        message: 'API key generada exitosamente'
      };
    } catch (error) {
      console.error('Error generando API key:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error generando API key'
      };
    }
  }
  
  // Listar API keys de un usuario
  async listApiKeys(userId: number): Promise<{
    apiKeys: any[];
    responseCode: number;
    message: string;
  }> {
    try {
      const result = await query(`
        SELECT 
          id, 
          api_key, 
          description, 
          permissions, 
          expires_at, 
          status, 
          created_at
        FROM api_keys
        WHERE user_id = $1 AND deleted_at IS NULL
        AND status = 'active'
        ORDER BY created_at DESC
      `, [userId]);
      
      return {
        apiKeys: result.rows.map(row => ({
          id: row.id,
          apiKey: row.api_key,
          description: row.description,
          permissions: row.permissions,
          expiresAt: row.expires_at,
          status: row.status,
          createdAt: row.created_at
        })),
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error listando API keys:', error);
      
      return {
        apiKeys: [],
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error listando API keys'
      };
    }
  }
  
  // Revocar API key
  async revokeApiKey(apiKeyId: number, userId: number, revokedByUserId?: number): Promise<ApiKeyResponse> {
    try {
      // Verificar que la API key pertenezca al usuario
      const apiKeyCheck = await query(`
        SELECT id, api_key
        FROM api_keys
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      `, [apiKeyId, userId]);
      
      if (apiKeyCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'API key no encontrada o no pertenece al usuario'
        };
      }
      
      // Revocar la API key
      await query(`
        UPDATE api_keys
        SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [apiKeyId]);
      
      // Registrar actividad
      // Activity logging removed
      
      return {
        id: apiKeyId,
        responseCode: 0,
        message: 'API key revocada exitosamente'
      };
    } catch (error) {
      console.error('Error revocando API key:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error revocando API key'
      };
    }
  }
}

export const apiKeyService = new ApiKeyService();
export default apiKeyService; 
