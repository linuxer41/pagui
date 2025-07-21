import { Elysia, t } from 'elysia';
import jwt from 'jsonwebtoken';
import { authService } from '../services/auth.service';
import { apiKeyService } from '../services/apikey.service';
import { logActivity } from '../services/monitor.service';
import { query } from '../config/database';

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

export interface AuthData {
  type: 'jwt' | 'apikey';
  user?: AuthUser;
  apiKeyInfo?: ApiKeyInfo;
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

// Middleware base de autenticación
export const authMiddleware = new Elysia({ name: 'auth' })
 
  .derive(async (context) => {
    try {
      // Obtener información del dispositivo
      const ipAddress = context.request.headers.get('x-forwarded-for') || 
                         context.request.headers.get('cf-connecting-ip') || 
                         context.request.headers.get('x-real-ip') || 
                         context.request.headers.get('host') || 
                         'unknown';
      
      const userAgent = context.request.headers.get('user-agent') || 'unknown';
      
      // Revisar primero el header Authorization para JWT
      const authHeader = context.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Quitar 'Bearer ' del inicio
        
        // Verificar el JWT
        try {
          // Primero verificar la firma del JWT
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
          
          // Luego verificar si el token existe en la base de datos
          const isValidInDb = await verifyTokenInDatabase(token);
          
          if (!isValidInDb) {
            throw new Error('Token no encontrado en la base de datos o ha expirado');
          }
          
          // Obtener información del usuario
          const userInfo = await authService.getUserInfo(decodedToken.email);
          
          if (!userInfo || userInfo.responseCode !== 0) {
            throw new Error('Usuario no encontrado');
          }
          
          // Registrar uso del token
          await logActivity(
            'TOKEN_USED',
            {
              path: context.path,
              method: context.request.method,
              ipAddress,
              userAgent
            },
            'SUCCESS',
            userInfo.companyId,
            userInfo.id
          );
          
          // Retornar datos de autenticación (JWT)
          return {
            auth: {
              type: 'jwt',
              user: {
                id: userInfo.id!,
                email: userInfo.email!,
                companyId: userInfo.companyId!,
                role: userInfo.role!
              }
            } as AuthData
          };
        } catch (error) {
          console.error('Error en autenticación JWT:', error);
          throw new Error('Error en autenticación');
        }
      }
      
      // Verificar si hay API key en los headers
      const apiKeyHeader = context.headers['x-api-key'];
      
      if (apiKeyHeader) {
        const apiKey = apiKeyHeader;
        
        // Verificar la API key
        const verification = await apiKeyService.verifyApiKey(apiKey);
        
        if (verification.isValid && verification.companyId && verification.permissions) {
          // API key válida
          // Registrar actividad de uso de API key
          await logActivity(
            'API_KEY_USED',
            {
              path: context.path,
              method: context.request.method,
              ipAddress,
              userAgent
            },
            'SUCCESS',
            verification.companyId
          );
          
          // Retornar datos de autenticación (API key)
          return {
            auth: {
              type: 'apikey',
              apiKeyInfo: {
                companyId: verification.companyId,
                permissions: verification.permissions
              }
            } as AuthData
          };
        }
        
        throw new Error('API key inválida');
      }
      
      throw new Error('No autorizado. Se requiere autenticación válida.');
    } catch (error) {
      console.error('Error en middleware de autenticación:', error);
      throw new Error('Error en autenticación');
    }
  });

// Funciones auxiliares que verifican permisos y roles directamente sin crear middlewares separados
export const requireApiKeyPermission = (permission: keyof ApiKeyPermissions) => {
  return async ({ auth, set, path, request }: { 
    auth?: AuthData, 
    set: { status: number }, 
    path: string, 
    request: { method: string } 
  }) => {
    if (!auth || auth.type !== 'apikey') {
      set.status = 403;
      return {
        error: 'Forbidden - API key required',
        status: 403
      };
    }

    if (!auth.apiKeyInfo?.permissions[permission]) {
      await logActivity(
        'API_KEY_PERMISSION_DENIED',
        {
          permission,
          path,
          method: request.method
        },
        'ERROR',
        auth.apiKeyInfo?.companyId
      );

      set.status = 403;
      return {
        error: `Forbidden - Missing permission: ${permission}`,
        status: 403
      };
    }

    // Si todo está bien, no retornamos nada
    return null;
  };
};

export const requireUserRole = (role: string) => {
  return async ({ auth, set, path, request }: { 
    auth?: AuthData, 
    set: { status: number }, 
    path: string, 
    request: { method: string } 
  }) => {
    if (!auth || auth.type !== 'jwt') {
      set.status = 403;
      return {
        error: 'Forbidden - User authentication required',
        status: 403
      };
    }

    if (auth.user?.role !== role && auth.user?.role !== 'ADMIN') {
      await logActivity(
        'ROLE_PERMISSION_DENIED',
        {
          requiredRole: role,
          userRole: auth.user?.role,
          path,
          method: request.method
        },
        'ERROR',
        auth.user?.companyId,
        auth.user?.id
      );

      set.status = 403;
      return {
        error: `Forbidden - Required role: ${role}`,
        status: 403
      };
    }

    // Si todo está bien, no retornamos nada
    return null;
  };
};

// Función para crear un middleware de permisos de API key
export const apiKeyPermissionMiddleware = (permission: keyof ApiKeyPermissions) => {
  return new Elysia()
    .use(authMiddleware)
    .onBeforeHandle(async (context) => {
      // Usar la función auxiliar
      // @ts-ignore - El auth está garantizado por el middleware de autenticación
      return requireApiKeyPermission(permission)(context);
    });
};

// Función para crear un middleware de rol de usuario
export const roleMiddleware = (role: string) => {
  return new Elysia()
    .use(authMiddleware)
    .onBeforeHandle(async (context) => {
      // Usar la función auxiliar
      // @ts-ignore - El auth está garantizado por el middleware de autenticación
      return requireUserRole(role)(context);
    });
};

export default authMiddleware; 