import { query } from '../config/database';
import { userService } from './user.service';
import { ApiError } from '../utils/error';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logActivity } from './monitor.service';
import accountService from './account.service';

export interface UserAuth {
  id: number;
  email: string;
  fullName: string;
  roleName: string;
  status: string;
  accounts: Array<{
    id: number;
    accountNumber: string;
    accountType: 'current' | 'savings' | 'business';
    currency: string;
    balance: number;
    availableBalance: number;
    status: 'active' | 'suspended' | 'closed';
    isPrimary: boolean;
  }>;
}

export interface UserInfo {
  id: number;
  email: string;
  fullName: string;
  businessId?: string;
  entityType: 'company' | 'individual';
  identificationType: string;
  identificationNumber: string;
  phoneNumber?: string;
  phoneExtension?: string;
  address?: string;
  roleId: number;
  roleName: string;
  isPrimaryUser: boolean;
  parentUserId?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  businessId?: string;
  entityType: 'company' | 'individual';
  identificationType: string;
  identificationNumber: string;
  phoneNumber?: string;
  phoneExtension?: string;
  address?: string;
  roleId: number;
  roleName: string;
  isPrimaryUser: boolean;
  parentUserId?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  businessId?: string;
  entityType: 'company' | 'individual';
  identificationType: string;
  identificationNumber: string;
  phoneNumber?: string;
  phoneExtension?: string;
  address?: string;
  roleId: number;
  isPrimaryUser?: boolean;
  parentUserId?: number;
}

export interface UpdateUserData {
  fullName?: string;
  phoneNumber?: string;
  phoneExtension?: string;
  address?: string;
  status?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RefreshTokenData {
  refreshToken: string;
}

class AuthService {
  
  // Autenticar usuario
  async authenticate(credentials: LoginCredentials): Promise<{ user: UserAuth; accessToken: string; refreshToken: string }> {
    try {
      // Buscar usuario por email
      const user = await userService.getUserByEmail(credentials.email);
      
      if (!user) {
        throw new ApiError('Credenciales inválidas', 401);
      }
      
      if (user.status !== 'active') {
        throw new ApiError('Usuario inactivo o suspendido', 401);
      }
      
      // Verificar contraseña - necesitamos obtener la contraseña hasheada
      const userWithPassword = await query(`
        SELECT password FROM users WHERE id = $1
      `, [user.id]);
      
      if (userWithPassword.rowCount === 0) {
        throw new ApiError('Error interno del sistema', 500);
      }
      
      const isValidPassword = await bcrypt.compare(credentials.password, userWithPassword.rows[0].password);
      
      if (!isValidPassword) {
        throw new ApiError('Credenciales inválidas', 401);
      }
      
      // Obtener cuentas del usuario
      const userAccounts = await accountService.getUserAccounts(user.id);
      
      // Generar tokens
      const { token: accessToken, expiresIn } = this.generateAccessToken(user);
      const { token: refreshToken, expiresIn: refreshExpiresIn } = this.generateRefreshToken(user.id);
      
      // Guardar access token
      await this.saveAccessToken(user.id, accessToken, expiresIn);
      
      // Guardar refresh token
      await this.saveRefreshToken(user.id, refreshToken, refreshExpiresIn);
      
      // Registrar actividad de login
      await logActivity(
        'USER_LOGIN',
        {
          userId: user.id,
          email: user.email,
          ip: 'unknown' // Se puede obtener del request
        },
        'info',
        user.id
      );
      
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roleName: user.roleName,
          status: user.status,
          accounts: userAccounts.map(account => ({
            id: account.id,
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            currency: account.currency,
            balance: account.balance,
            availableBalance: account.availableBalance,
            status: account.status,
            isPrimary: account.isPrimary
          }))
        },
        accessToken,
        refreshToken
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Generar token de acceso
  private generateAccessToken(user: User): { token: string, expiresIn: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      roleName: user.roleName,
      isPrimaryUser: user.isPrimaryUser,
      parentUserId: user.parentUserId,
      entityType: user.entityType,
      businessId: user.businessId
    };
    
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    return {
      token: jwt.sign(payload, secret, { expiresIn: expiresIn as any }),
      expiresIn: expiresIn
    };
  }
  
  // Generar refresh token
  private generateRefreshToken(userId: number): { token: string, expiresIn: string } {
    const payload = { userId, type: 'refresh' };
    const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    const expiresIn = '30d';
    
    return {
      token: jwt.sign(payload, secret, { expiresIn: expiresIn as any }),
      expiresIn: expiresIn
    };
  }
  
  // Guardar access token
  private async saveAccessToken(userId: number, token: string, expiresIn: string): Promise<void> {
    try {
      console.log('💾 Guardando access token para usuario:', userId);
      
      // Insertar el nuevo token directamente
      console.log('➕ Insertando nuevo token...');
      const insertResult = await query(`
        INSERT INTO auth_tokens (user_id, token_type, token)
        VALUES ($1, 'ACCESS_TOKEN', $2)
        RETURNING id
      `, [userId, token]);
      console.log('✅ Token insertado con ID:', insertResult.rows[0]?.id);
      
    } catch (error) {
      console.error('❌ Error al guardar access token:', error);
      // No re-lanzar el error para evitar que falle el login
      console.log('⚠️ Continuando sin guardar access token...');
    }
  }

  // Guardar refresh token
  private async saveRefreshToken(userId: number, token: string, expiresIn: string): Promise<void> {
    try {
      await query(`
        INSERT INTO auth_tokens (user_id, token_type, token)
        VALUES ($1, 'REFRESH_TOKEN', $2)
        ON CONFLICT (user_id, token_type) 
        DO UPDATE SET token = $2, updated_at = CURRENT_TIMESTAMP
      `, [userId, token]);
      
    } catch (error) {
      console.error('Error al guardar refresh token:', error);
    }
  }
  
  // Verificar refresh token
  async verifyRefreshToken(refreshToken: string): Promise<{ user: UserAuth; accessToken: string; newRefreshToken: string }> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
      const decoded = jwt.verify(refreshToken, secret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new ApiError('Token inválido', 401);
      }
      
      // Verificar que el token existe en la base de datos
      const tokenResult = await query(`
        SELECT user_id FROM auth_tokens 
        WHERE token = $1 AND token_type = 'REFRESH_TOKEN'
      `, [refreshToken]);
      
      if (tokenResult.rowCount === 0) {
        throw new ApiError('Token expirado o inválido', 401);
      }
      
      const userId = decoded.userId;
      const user = await userService.getUserById(userId);
      
      if (!user || user.status !== 'active') {
        throw new ApiError('Usuario no encontrado o inactivo', 401);
      }
      
      // Generar nuevos tokens
      const { token: accessToken } = this.generateAccessToken(user);
      const { token: newRefreshToken, expiresIn: newRefreshExpiresIn } = this.generateRefreshToken(userId);
      
      // Actualizar refresh token
      await this.saveRefreshToken(userId, newRefreshToken, newRefreshExpiresIn);
      
      // Revocar token anterior
      await this.revokeRefreshToken(refreshToken);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roleName: user.roleName,
          status: user.status,
          accounts: []
        },
        accessToken,
        newRefreshToken
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Revocar refresh token
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await query(`
        DELETE FROM auth_tokens 
        WHERE token = $1 AND token_type = 'REFRESH_TOKEN'
      `, [token]);
      
    } catch (error) {
      console.error('Error al revocar refresh token:', error);
    }
  }

  // Revocar access token
  async revokeAccessToken(token: string): Promise<void> {
    try {
      await query(`
        DELETE FROM auth_tokens 
        WHERE token = $1 AND token_type = 'ACCESS_TOKEN'
      `, [token]);
      
    } catch (error) {
      console.error('Error al revocar access token:', error);
    }
  }

  // Revocar todos los tokens de un usuario
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await query(`
        DELETE FROM auth_tokens 
        WHERE user_id = $1
      `, [userId]);
      
    } catch (error) {
      console.error('Error al revocar tokens del usuario:', error);
    }
  }
  
  // Limpiar tokens expirados ya no es necesario
  // Los tokens JWT se verifican automáticamente por expiración
  async cleanupExpiredTokens(): Promise<void> {
    try {
      // Solo limpiar tokens que puedan estar en estado inconsistente
      // Los tokens expirados se manejan automáticamente por JWT
      console.log('ℹ️ Limpieza de tokens no requerida - JWT maneja expiración automáticamente');
      
    } catch (error) {
      console.error('Error en limpieza de tokens:', error);
    }
  }
  
  // Crear usuario
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      return await userService.createUser(userData);
    } catch (error) {
      throw error;
    }
  }
  
  // Obtener usuario por ID
  async getUserById(userId: number): Promise<User | null> {
    try {
      return await userService.getUserById(userId);
    } catch (error) {
      throw error;
    }
  }
  
  // Obtener usuarios por empresa (usuario principal)
  async getUsersByCompany(primaryUserId: number): Promise<User[]> {
    try {
      const primaryUser = await userService.getUserById(primaryUserId);
      
      if (!primaryUser || !primaryUser.isPrimaryUser) {
        throw new ApiError('Usuario no es principal de empresa', 400);
      }
      
      const employees = await userService.getEmployeeUsers(primaryUserId);
      return [primaryUser, ...employees];
      
    } catch (error) {
      throw error;
    }
  }
  
  // Actualizar usuario
  async updateUser(userId: number, updateData: UpdateUserData): Promise<User> {
    try {
      return await userService.updateUser(userId, updateData);
    } catch (error) {
      throw error;
    }
  }
  
  // Cambiar contraseña de usuario
  async changeUserPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      return await userService.changeUserPassword(userId, newPassword);
    } catch (error) {
      throw error;
    }
  }
  
  // Eliminar usuario
  async deleteUser(userId: number): Promise<boolean> {
    try {
      return await userService.deleteUser(userId);
    } catch (error) {
      throw error;
    }
  }
  
  // Verificar si puede crear empleados
  async canCreateEmployees(userId: number): Promise<boolean> {
    try {
      return await userService.canCreateEmployees(userId);
    } catch (error) {
      return false;
    }
  }
  
  // Obtener empleados
  async getEmployeeUsers(primaryUserId: number): Promise<User[]> {
    try {
      return await userService.getEmployeeUsers(primaryUserId);
    } catch (error) {
      throw error;
    }
  }
  
  // Verificar token JWT
  async verifyToken(token: string): Promise<any> {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret);
      
      // Verificar que el token no esté revocado en la base de datos
      if (!(await this.isTokenRevoked(token))) {
        return decoded;
      }
      
      throw new ApiError('Token revocado', 401);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Token inválido o expirado', 401);
    }
  }

  // Verificar si un token está revocado (eliminado de la base de datos)
  private async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const result = await query(`
        SELECT id FROM auth_tokens 
        WHERE token = $1
      `, [token]);
      
      return result.rowCount === 0;
    } catch (error) {
      console.error('Error verificando revocación de token:', error);
      return true; // Si hay error, considerar como revocado por seguridad
    }
  }

  // Obtener información del usuario por email (para el middleware)
  async getUserInfo(email: string): Promise<{
    id: number;
    email: string;
    parentUserId: number;
    role: string;
    bankCredentialId: number;
  } | null> {
    try {
      const user = await userService.getUserByEmail(email);
      
      if (!user) {
        return null;
      }

      // Para usuarios individuales, usar su propio ID como companyId
      // Para usuarios de empresa, usar su businessId o ID
      let parentUserId = user.id; // Por defecto, usar su propio ID
      
      if (user.entityType === 'company') {
        // Si es una empresa, usar su ID como companyId
        parentUserId = user.id;
      } else if (user.parentUserId) {
        // Si es un empleado, usar el ID de su empresa padre
        parentUserId = user.parentUserId;
      }

      return {
        id: user.id,
        email: user.email,
        parentUserId: parentUserId,
        role: user.roleName,
        bankCredentialId: user.bankCredentialId || 0
      };
    } catch (error) {
      console.error('Error obteniendo información del usuario:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;