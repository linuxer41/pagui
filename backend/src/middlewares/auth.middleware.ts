import { Elysia, t } from 'elysia';
import jwt from 'jsonwebtoken';
import {authService}  from '../services/auth.service';
import { apiKeyService } from '../services/apikey.service';
import { logActivity } from '../services/monitor.service';
import { query } from '../config/database';
import { ApiError } from '../utils/error';

// Define the ApiKeyPermissions interface locally to match the one in apikey.service
interface ApiKeyPermissions {
  qr_generate: boolean;
  qr_status: boolean;
  qr_cancel: boolean;
}

// Tipos para datos de autenticación
export interface AuthUser {
  id: number;
  email: string;
  companyId: number;
  role: string;
}

export interface ApiKeyInfo {
  companyId: number;
  permissions: ApiKeyPermissions;
}

interface JWTAuthData {
  type: 'jwt';
  user: {
    id: number;
    email: string;
    companyId: number;
    role: string;
  };
}

interface APIKeyAuthData {
  type: 'apikey';
  apiKeyInfo: {
    companyId: number;
    permissions: Record<string, any>;
  };
}

type AuthData = JWTAuthData | APIKeyAuthData;

interface AuthMiddlewareOptions {
  type: 'jwt' | 'apikey' | 'all';
  level: 'user' | 'admin';
}

// Función para verificar y actualizar el token en la base de datos
async function verifyTokenInDatabase(token: string): Promise<boolean> {
  try {
    // Buscar el token en la base de datos
    const result = await query(`
      SELECT id, user_id, expires_at, used_times
      FROM auth_tokens
      WHERE token = $1
      AND token_type = 'ACCESS_TOKEN'
      AND deleted_at IS NULL
      AND expires_at > NOW()
    `, [token]);

    // Si no existe el token o ha expirado
    if (result.rowCount === 0) {
      return false;
    }

    const tokenData = result.rows[0];

    // Actualizar el contador de usos
    await query(`
      UPDATE auth_tokens
      SET used_times = used_times + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [tokenData.id]);

    return true;
  } catch (error) {
    console.error('Error verificando token en base de datos:', error);
    return false;
  }
}

// Define a generic function with conditional return type
export function authMiddleware<T extends 'jwt' | 'apikey' | 'all'>(
  options: { type: T; level: 'user' | 'admin' } = { type: 'jwt' as T, level: 'user' }
) {
  type ReturnType = 
    T extends 'jwt' ? { auth: JWTAuthData } :
    T extends 'apikey' ? { auth: APIKeyAuthData } :
    { auth: AuthData };

  return new Elysia({ name: 'auth' })
    .derive(async (context): Promise<ReturnType> => {
      try {
        // Get device information
        const ipAddress = context.request.headers.get('x-forwarded-for') || 
                         context.request.headers.get('cf-connecting-ip') || 
                         context.request.headers.get('x-real-ip') || 
                         context.request.headers.get('host') || 
                         'unknown';
        
        const userAgent = context.request.headers.get('user-agent') || 'unknown';
        
        // Check Authorization header for JWT
        const authHeader = context.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ') && (options.type === 'jwt' || options.type === 'all')) {
          const token = authHeader.substring(7); // Remove 'Bearer ' prefix
          
          try {
            // Verify JWT signature
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            
            // Verify if token exists in database
            const isValidInDb = await verifyTokenInDatabase(token);
            
            if (!isValidInDb) {
              throw new ApiError('Token no encontrado en la base de datos o ha expirado', 401);
            }
            
            // Get user information
            const userInfo = await authService.getUserInfo(decodedToken.email);
            
            if (!userInfo || !userInfo.id) {
              throw new ApiError('Usuario no encontrado', 404);
            }
            
            // Validate required access level
            if (options.level === 'admin' && userInfo.role !== 'ADMIN' && userInfo.role !== 'SUPER_ADMIN') {
              throw new ApiError('Se requiere rol de administrador', 403);
            }
            
            // Log token usage
            await logActivity(
              'TOKEN_USED',
              {
                path: context.path,
                method: context.request.method,
                ipAddress,
                userAgent
              },
              'INFO',
              userInfo.companyId,
              userInfo.id
            );
            
            // Return authentication data (JWT)
            return {
              auth: {
                type: 'jwt',
                user: {
                  id: userInfo.id,
                  email: userInfo.email!,
                  companyId: userInfo.companyId!,
                  role: userInfo.role!
                }
              }
            } as unknown as ReturnType;
          } catch (error) {
            console.error('Error en autenticación JWT:', error);
            if (error instanceof ApiError) {
              throw error;
            }
            throw new ApiError('Error en autenticación', 401);
          }
        }
        
        // Check headers for API key
        const apiKeyHeader = context.headers['x-api-key'];
        
        if (apiKeyHeader && (options.type === 'apikey' || options.type === 'all')) {
          const apiKey = apiKeyHeader;
          
          // Verify API key
          const verification = await apiKeyService.verifyApiKey(apiKey);
          
          if (verification.isValid && verification.companyId && verification.permissions) {
            // If admin level required, verify admin permissions in the API key
            if (options.level === 'admin' && !verification.permissions.qr_generate) {
              throw new ApiError('Se requieren permisos de administrador', 403);
            }
            
            // Log API key usage
            await logActivity(
              'API_KEY_USED',
              {
                path: context.path,
                method: context.request.method,
                ipAddress,
                userAgent
              },
              'INFO',
              verification.companyId
            );
            
            // Return authentication data (API key)
            return {
              auth: {
                type: 'apikey',
                apiKeyInfo: {
                  companyId: verification.companyId,
                  permissions: verification.permissions
                }
              }
            } as unknown as ReturnType;
          }
          
          throw new ApiError('API key inválida', 401);
        }
        
        throw new ApiError(
          options.type === 'jwt' ? 'Se requiere autenticación JWT' : 
          options.type === 'apikey' ? 'Se requiere API key' : 
          'No autorizado. Se requiere autenticación válida.',
          401
        );
      } catch (error) {
        console.error('Error en middleware de autenticación:', error);
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError('Error en autenticación', 401);
      }
    });
}


export default authMiddleware; 