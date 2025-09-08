import { query } from '../config/database';
import { ApiError } from '../utils/error';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  roleId: number;
  roleName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  address?: string;
  roleId: number;
}

export interface UpdateUserData {
  fullName?: string;
  phone?: string;
  address?: string;
  status?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roleId?: number;
}

export interface UserListResponse {
  users: User[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

class UserService {
  
  // Crear nuevo usuario
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Validar que el email no exista
      const existingUser = await query(`
        SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL
      `, [userData.email]);
      
      if (existingUser.rowCount && existingUser.rowCount > 0) {
        throw new ApiError('El email ya está registrado', 400);
      }
      
      // Validaciones simplificadas para el esquema actual
      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Insertar usuario
      const result = await query(`
        INSERT INTO users (
          email, password, full_name, phone, address, role_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id
      `, [
        userData.email,
        hashedPassword,
        userData.fullName,
        userData.phone,
        userData.address,
        userData.roleId
      ]);
      
      const userId = result.rows[0].id;
      
      // Obtener usuario completo con rol
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new ApiError('Error al crear usuario', 500);
      }
      
      // Activity logging removed
      
      return user;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Obtener usuario por ID
  async getUserById(userId: number): Promise<User | null> {
    try {
      const result = await query(`
        SELECT 
          u.id, u.email, u.full_name as "fullName", u.phone, u.address, 
          u.role_id as "roleId", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
          r.name as "roleName"
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `, [userId]);
      
      if (result.rowCount === 0) {
        return null;
      }
      
      return result.rows[0] as User;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Obtener usuario por email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await query(`
        SELECT 
          u.id, u.email, u.full_name as "fullName", u.phone, u.address, 
          u.role_id as "roleId", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
          r.name as "roleName"
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.email = $1 AND u.deleted_at IS NULL
      `, [email]);
      
      if (result.rowCount === 0) {
        return null;
      }
      
      return result.rows[0] as User;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Listar usuarios con filtros
  async getUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE u.deleted_at IS NULL';
      const params: any[] = [];
      let paramCount = 0;
      
      if (filters.search) {
        paramCount++;
        whereClause += ` AND (u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }
      
      if (filters.status) {
        paramCount++;
        whereClause += ` AND u.status = $${paramCount}`;
        params.push(filters.status);
      }
      
      if (filters.roleId) {
        paramCount++;
        whereClause += ` AND u.role_id = $${paramCount}`;
        params.push(filters.roleId);
      }
      
      // Obtener total de registros
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM users u
        ${whereClause}
      `, params);
      
      const totalCount = parseInt(countResult.rows[0].total);
      
      // Obtener usuarios
      const usersResult = await query(`
        SELECT 
          u.id, u.email, u.full_name as "fullName", u.phone, u.address, 
          u.role_id as "roleId", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
          r.name as "roleName"
        FROM users u
        JOIN roles r ON u.role_id = r.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...params, limit, offset]);
      
      const users = usersResult.rows as User[];
      
      return {
        users,
        totalCount,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  // Obtener empleados de un usuario principal (simplificado - no implementado en esquema actual)
  async getEmployeeUsers(primaryUserId: number): Promise<User[]> {
    // En el esquema simplificado no hay funcionalidad de empleados
    return [];
  }
  
  // Actualizar usuario
  async updateUser(userId: number, updateData: UpdateUserData): Promise<User> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new ApiError('Usuario no encontrado', 404);
      }
      
      // Construir query de actualización
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCount = 0;
      
      if (updateData.fullName !== undefined) {
        paramCount++;
        updateFields.push(`full_name = $${paramCount}`);
        params.push(updateData.fullName);
      }
      
      if (updateData.phone !== undefined) {
        paramCount++;
        updateFields.push(`phone = $${paramCount}`);
        params.push(updateData.phone);
      }
      
      if (updateData.address !== undefined) {
        paramCount++;
        updateFields.push(`address = $${paramCount}`);
        params.push(updateData.address);
      }
      
      if (updateData.status !== undefined) {
        paramCount++;
        updateFields.push(`status = $${paramCount}`);
        params.push(updateData.status);
      }
      
      if (updateFields.length === 0) {
        throw new ApiError('No hay campos para actualizar', 400);
      }
      
      paramCount++;
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const result = await query(`
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id
      `, [...params, userId]);
      
      if (result.rowCount === 0) {
        throw new ApiError('Error al actualizar usuario', 500);
      }
      
      // Obtener usuario actualizado
      const updatedUser = await this.getUserById(userId);
      
      if (!updatedUser) {
        throw new ApiError('Error al obtener usuario actualizado', 500);
      }
      
      // Registrar actividad
      // Activity logging removed
      
      return updatedUser;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Cambiar contraseña
  async changeUserPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new ApiError('Usuario no encontrado', 404);
      }
      
      // Encriptar nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const result = await query(`
        UPDATE users 
        SET password = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [hashedPassword, userId]);
      
      if (result.rowCount === 0) {
        throw new ApiError('Error al cambiar contraseña', 500);
      }
      
      // Registrar actividad
      // Activity logging removed
      
      return true;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Eliminar usuario (soft delete)
  async deleteUser(userId: number): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new ApiError('Usuario no encontrado', 404);
      }
      
      const result = await query(`
        UPDATE users 
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [userId]);
      
      if (result.rowCount === 0) {
        throw new ApiError('Error al eliminar usuario', 500);
      }
      
      // Registrar actividad
      // Activity logging removed
      
      return true;
      
    } catch (error) {
      throw error;
    }
  }
  
  // Verificar si un usuario puede crear empleados
  async canCreateEmployees(userId: number): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        return false;
      }
      
      // Solo usuarios principales de empresas pueden crear empleados
      return user.isPrimaryUser && user.entityType === 'company';
      
    } catch (error) {
      return false;
    }
  }
  
  // Obtener estadísticas de usuarios
  async getUserStats(userId: number): Promise<any> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new ApiError('Usuario no encontrado', 404);
      }
      
      let stats: any = {
        totalQRCodes: 0,
        totalTransactions: 0,
        totalEmployees: 0
      };
      
      // Contar códigos QR
      const qrResult = await query(`
        SELECT COUNT(*) as total FROM qr_codes 
        WHERE user_id = $1 AND deleted_at IS NULL
      `, [userId]);
      
      stats.totalQRCodes = parseInt(qrResult.rows[0].total);
      
      // Contar movimientos de cuenta (transacciones)
      const transResult = await query(`
        SELECT COUNT(*) as total FROM account_movements am
        JOIN user_accounts ua ON am.account_id = ua.account_id
        WHERE ua.user_id = $1 AND am.deleted_at IS NULL
      `, [userId]);
      
      stats.totalTransactions = parseInt(transResult.rows[0].total);
      
      // Contar empleados si es usuario principal
      if (user.isPrimaryUser) {
        const empResult = await query(`
          SELECT COUNT(*) as total FROM users 
          WHERE parent_user_id = $1 AND deleted_at IS NULL
        `, [userId]);
        
        stats.totalEmployees = parseInt(empResult.rows[0].total);
      }
      
      return stats;
      
    } catch (error) {
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;
