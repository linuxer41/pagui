import { query, generateApiKey } from '../config/database';
import { logActivity } from './monitor.service';

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
  companyId?: number;
  expiresAt?: string | null;
  status?: string;
  createdAt?: string;
  responseCode: number;
  message: string;
}

class ApiKeyService {
  
  // Verificar si una API key es válida
  async verifyApiKey(apiKey: string): Promise<{
    isValid: boolean;
    companyId?: number;
    permissions?: ApiKeyPermissions;
  }> {
    try {
      const result = await query(`
        SELECT id, company_id, permissions, expires_at, status
        FROM api_keys
        WHERE api_key = $1
      `, [apiKey]);
      
      if (result.rowCount === 0) {
        return { isValid: false };
      }
      
      const apiKeyData = result.rows[0];
      
      // Verificar que la API key esté activa
      if (apiKeyData.status !== 'ACTIVE') {
        return { isValid: false };
      }
      
      // Verificar que no haya expirado
      if (apiKeyData.expires_at && new Date() > new Date(apiKeyData.expires_at)) {
        // Marcar como expirada en la base de datos
        await query(`
          UPDATE api_keys
          SET status = 'EXPIRED'
          WHERE id = $1
        `, [apiKeyData.id]);
        
        return { isValid: false };
      }
      
      // API key válida
      return {
        isValid: true,
        companyId: apiKeyData.company_id,
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
    companyId: number,
    description: string,
    permissions: ApiKeyPermissions,
    expiresAt?: string | null,
    userId?: number
  ): Promise<ApiKeyResponse> {
    try {
      // Verificar que la empresa exista
      const companyCheck = await query('SELECT id FROM companies WHERE id = $1', [companyId]);
      
      if (companyCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Empresa no encontrada'
        };
      }
      
      // Generar una nueva API key
      const apiKey = generateApiKey();
      
      // Guardar en la base de datos
      const result = await query(`
        INSERT INTO api_keys (
          api_key, 
          description, 
          company_id, 
          permissions, 
          expires_at
        ) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `, [
        apiKey,
        description,
        companyId,
        JSON.stringify(permissions),
        expiresAt ? new Date(expiresAt) : null
      ]);
      
      // Registrar actividad
      await logActivity(
        'API_KEY_GENERATED',
        {
          apiKeyId: result.rows[0].id,
          description,
          expiresAt
        },
        'INFO',
        companyId,
        userId
      );
      
      return {
        id: result.rows[0].id,
        apiKey,
        description,
        permissions,
        companyId,
        expiresAt,
        status: 'ACTIVE',
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
  
  // Listar API keys de una empresa
  async listApiKeys(companyId: number): Promise<{
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
        WHERE company_id = $1
        ORDER BY created_at DESC
      `, [companyId]);
      
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
  async revokeApiKey(apiKeyId: number, companyId: number, userId?: number): Promise<ApiKeyResponse> {
    try {
      // Verificar que la API key pertenezca a la empresa
      const apiKeyCheck = await query(`
        SELECT id, api_key
        FROM api_keys
        WHERE id = $1 AND company_id = $2
      `, [apiKeyId, companyId]);
      
      if (apiKeyCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'API key no encontrada o no pertenece a su empresa'
        };
      }
      
      // Revocar la API key
      await query(`
        UPDATE api_keys
        SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [apiKeyId]);
      
      // Registrar actividad
      await logActivity(
        'API_KEY_REVOKED',
        {
          apiKeyId,
          apiKey: apiKeyCheck.rows[0].api_key
        },
        'INFO',
        companyId,
        userId
      );
      
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