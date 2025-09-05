import { query } from '../config/database';
import { logActivity } from './monitor.service';
import { ApiError } from '../utils/error';
import bcrypt from 'bcrypt';

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
  bankCredentialId?: number;
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
  bankCredentialId?: number;
}

export interface UpdateUserData {
  fullName?: string;
  phoneNumber?: string;
  phoneExtension?: string;
  address?: string;
  status?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  entityType?: string;
  roleId?: number;
  isPrimaryUser?: boolean;
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
      
      // Validar que la identificación no exista
      const existingId = await query(`
        SELECT id FROM users WHERE identification_type = $1 AND identification_number = $2 AND deleted_at IS NULL
      `, [userData.identificationType, userData.identificationNumber]);
      
      if (existingId.rowCount && existingId.rowCount > 0) {
        throw new ApiError('La identificación ya está registrada', 400);
      }
      
      // Validar business_id único si es empresa
      if (userData.entityType === 'company' && userData.businessId) {
        const existingBusiness = await query(`
          SELECT id FROM users WHERE business_id = $1 AND deleted_at IS NULL
        `, [userData.businessId]);
        
        if (existingBusiness.rowCount && existingBusiness.rowCount > 0) {
          throw new ApiError('El business ID ya está registrado', 400);
        }
      }
      
      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Insertar usuario
      const result = await query(`
        INSERT INTO users (
          email, password, full_name, business_id, entity_type, identification_type, 
          identification_number, phone_number, phone_extension, address, role_id, 
          is_primary_user, parent_user_id, third_bank_credential_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
        RETURNING id
      `, [
        userData.email,
        hashedPassword,
        userData.fullName,
        userData.businessId,
        userData.entityType,
        userData.identificationType,
        userData.identificationNumber,
        userData.phoneNumber,
        userData.phoneExtension,
        userData.address,
        userData.roleId,
        userData.isPrimaryUser || false,
        userData.parentUserId,
        userData.bankCredentialId
      ]);
      
      const userId = result.rows[0].id;
      
      // Obtener usuario completo con rol
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new ApiError('Error al crear usuario', 500);
      }
      
      // Registrar actividad
      await logActivity(
        'USER_CREATED',
        {
          userId: user.id,
          email: user.email,
          entityType: user.entityType
        },
        'info',
        user.id
      );
      
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
          u.id, u.email, u.full_name as "fullName", u.business_id as "businessId",
          u.entity_type as "entityType", u.identification_type as "identificationType",
          u.identification_number as "identificationNumber", u.phone_number as "phoneNumber",
          u.phone_extension as "phoneExtension", u.address, u.role_id as "roleId",
          u.is_primary_user as "isPrimaryUser", u.parent_user_id as "parentUserId",
          u.third_bank_credential_id as "bankCredentialId", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
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
          u.id, u.email, u.full_name as "fullName", u.business_id as "businessId",
          u.entity_type as "entityType", u.identification_type as "identificationType",
          u.identification_number as "identificationNumber", u.phone_number as "phoneNumber",
          u.phone_extension as "phoneExtension", u.address, u.role_id as "roleId",
          u.is_primary_user as "isPrimaryUser", u.parent_user_id as "parentUserId",
          u.third_bank_credential_id as "bankCredentialId", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
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
      
      if (filters.entityType) {
        paramCount++;
        whereClause += ` AND u.entity_type = $${paramCount}`;
        params.push(filters.entityType);
      }
      
      if (filters.roleId) {
        paramCount++;
        whereClause += ` AND u.role_id = $${paramCount}`;
        params.push(filters.roleId);
      }
      
      if (filters.isPrimaryUser !== undefined) {
        paramCount++;
        whereClause += ` AND u.is_primary_user = $${paramCount}`;
        params.push(filters.isPrimaryUser);
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
          u.id, u.email, u.full_name as "fullName", u.business_id as "businessId",
          u.entity_type as "entityType", u.identification_type as "identificationType",
          u.identification_number as "identificationNumber", u.phone_number as "phoneNumber",
          u.phone_extension as "phoneExtension", u.address, u.role_id as "roleId",
          u.is_primary_user as "isPrimaryUser", u.parent_user_id as "parentUserId",
          u.third_bank_credential_id as "bankCredentialId", u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
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
  
  // Obtener empleados de un usuario principal
  async getEmployeeUsers(primaryUserId: number): Promise<User[]> {
    try {
      const result = await query(`
        SELECT 
          u.id, u.email, u.full_name as "fullName", u.business_id as "businessId",
          u.entity_type as "entityType", u.identification_type as "identificationType",
          u.identification_number as "identificationNumber", u.phone_number as "phoneNumber",
          u.phone_extension as "phoneExtension", u.address, u.role_id as "roleId",
          u.is_primary_user as "isPrimaryUser", u.parent_user_id as "parentUserId",
          u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
          r.name as "roleName"
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.parent_user_id = $1 AND u.deleted_at IS NULL
        ORDER BY u.created_at ASC
      `, [primaryUserId]);
      
      return result.rows as User[];
      
    } catch (error) {
      throw error;
    }
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
      
      if (updateData.phoneNumber !== undefined) {
        paramCount++;
        updateFields.push(`phone_number = $${paramCount}`);
        params.push(updateData.phoneNumber);
      }
      
      if (updateData.phoneExtension !== undefined) {
        paramCount++;
        updateFields.push(`phone_extension = $${paramCount}`);
        params.push(updateData.phoneExtension);
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
      await logActivity(
        'USER_UPDATED',
        {
          userId: user.id,
          updatedFields: Object.keys(updateData)
        },
        'info',
        user.id
      );
      
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
      await logActivity(
        'USER_PASSWORD_CHANGED',
        {
          userId: user.id
        },
        'info',
        user.id
      );
      
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
      
      // Verificar que no tenga empleados activos
      if (user.isPrimaryUser) {
        const employees = await this.getEmployeeUsers(userId);
        const activeEmployees = employees.filter(emp => emp.status === 'active');
        
        if (activeEmployees.length > 0) {
          throw new ApiError('No se puede eliminar un usuario principal con empleados activos', 400);
        }
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
      await logActivity(
        'USER_DELETED',
        {
          userId: user.id,
          email: user.email
        },
        'info',
        user.id
      );
      
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
      
      // Contar transacciones
      const transResult = await query(`
        SELECT COUNT(*) as total FROM transactions 
        WHERE user_id = $1 AND deleted_at IS NULL
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
