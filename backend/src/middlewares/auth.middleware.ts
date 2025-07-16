import { Elysia, t } from 'elysia';
import jwt from 'jsonwebtoken';
import { authService } from '../services/auth.service';
import { apiKeyService } from '../services/apikey.service';
import { logActivity } from '../services/monitor.service';

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

// Middleware base de autenticación
export const authMiddleware = new Elysia({ name: 'auth' })
 
  .derive(async (context) => {
    try {
      // Revisar primero el header Authorization para JWT
      const authHeader = context.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Quitar 'Bearer ' del inicio
        
        // Verificar el JWT
        try {
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
          
          // Obtener información del usuario
          const userInfo = await authService.getUserInfo(decodedToken.email);
          
          if (!userInfo || userInfo.responseCode !== 0) {
            throw new Error('Usuario no encontrado');
          }
          
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
              method: context.request.method
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