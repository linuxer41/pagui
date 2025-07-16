import { query } from '../config/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { CryptoService } from './crypto.service';
import { logActivity } from './monitor.service';

// Secreto para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Expiración del token en segundos (24 horas por defecto)
const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY || '86400', 10);

class AuthService {
  private cryptoService: CryptoService;

  constructor() {
    // Inicializar el servicio de criptografía
    this.cryptoService = new CryptoService(process.env.CRYPTO_KEY || 'default-encryption-key');
  }

  // Autenticación de usuario
  async authenticate(email: string, password: string): Promise<{
    user: {
      userId?: number;
      companyId?: number;
      email?: string;
      role?: string;
      responseCode: number;
      message: string;
    },
    auth: {
      accessToken: string;
      refreshToken: string;
    }
  }> {
    // Buscar usuario por email
    const userQuery = await query(`
      SELECT * FROM users WHERE email = $1 AND status = 'ACTIVE' AND deleted_at IS NULL`, [email]);
    if (userQuery.rowCount === 0) {
      return {
        user: {
          responseCode: 1,
          message: 'Usuario no encontrado'
        },
        auth: {
          accessToken: '',
          refreshToken: ''
        }
      };
    }
    const user = userQuery.rows[0];
    // Verificar contraseña
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return {
        user: {
          responseCode: 1,
          message: 'Contraseña incorrecta'
        },
        auth: {
          accessToken: '',
          refreshToken: ''
        }
      };
    }
    // Generar tokens JWT reales
    const accessToken = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    return {
      user: {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
        responseCode: 0,
        message: 'Autenticación exitosa'
      },
      auth: {
        accessToken,
        refreshToken
      }
    };
  }

  // Verificar validez de un token
  async verifyToken(token: string): Promise<boolean> {
    try {
      jwt.verify(token, JWT_SECRET);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Cambiar contraseña
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{
    responseCode: number;
    message: string;
  }> {
    try {
      // Obtener usuario actual
      const userResult = await query(
        'SELECT id, email, password, company_id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );

      if (userResult.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Usuario no encontrado'
        };
      }

      const user = userResult.rows[0];

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);

      if (!isValidPassword) {
        await logActivity(
          'PASSWORD_CHANGE_FAILED',
          { userId, reason: 'INVALID_CURRENT_PASSWORD' },
          'ERROR',
          user.company_id,
          userId
        );
        
        return {
          responseCode: 1,
          message: 'Contraseña actual incorrecta'
        };
      }

      // Hash de la nueva contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, userId]
      );

      // Registrar cambio de contraseña exitoso
      await logActivity(
        'PASSWORD_CHANGED',
        { userId },
        'SUCCESS',
        user.company_id,
        userId
      );

      return {
        responseCode: 0,
        message: 'Contraseña actualizada exitosamente'
      };
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error cambiando contraseña'
      };
    }
  }

  // Encriptar un texto
  encryptText(text: string, aesKey: string): string {
    try {
      return this.cryptoService.encrypt(text, aesKey);
    } catch (error) {
      throw new Error('Error al encriptar el texto');
    }
  }

  // Desencriptar un texto
  decryptText(encryptedText: string, aesKey: string): string {
    try {
      return this.cryptoService.decrypt(encryptedText, aesKey);
    } catch (error) {
      throw new Error('Error al desencriptar el texto');
    }
  }
  
  // Crear un nuevo usuario
  async createUser(
    userData: {
      email: string;
      password: string;
      fullName: string;
      companyId: number;
      role: string;
    },
    creatorId?: number
  ): Promise<{
    id?: number;
    email?: string;
    responseCode: number;
    message: string;
  }> {
    try {
      // Verificar si el usuario ya existe
      const existingCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
        [userData.email]
      );
      
      if (existingCheck.rowCount && existingCheck.rowCount > 0) {
        return {
          responseCode: 1,
          message: `El usuario ${userData.email} ya existe`
        };
      }
      
      // Verificar que la empresa exista
      const companyCheck = await query(
        'SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [userData.companyId]
      );
      
      if (companyCheck.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'La empresa especificada no existe'
        };
      }
      
      // Hash de la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Crear el usuario
      const result = await query(`
        INSERT INTO users (
          email,
          password,
          full_name,
          company_id,
          role
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        userData.email,
        hashedPassword,
        userData.fullName,
        userData.companyId,
        userData.role
      ]);
      
      const userId = result.rows[0].id;
      
      // Registrar creación de usuario
      await logActivity(
        'USER_CREATED',
        {
          userId,
          email: userData.email,
          companyId: userData.companyId,
          role: userData.role
        },
        'SUCCESS',
        userData.companyId,
        creatorId
      );
      
      return {
        id: userId,
        email: userData.email,
        responseCode: 0,
        message: 'Usuario creado exitosamente'
      };
    } catch (error) {
      console.error('Error creando usuario:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error creando usuario'
      };
    }
  }
  
  // Obtener información de un usuario
  async getUserInfo(email: string): Promise<{
    id?: number;
    email?: string;
    fullName?: string;
    companyId?: number;
    companyName?: string;
    role?: string;
    responseCode: number;
    message: string;
  }> {
    try {
      const result = await query(`
        SELECT 
          u.id, 
          u.email, 
          u.full_name, 
          u.company_id, 
          c.name as company_name,
          u.role
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.email = $1 AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      `, [email]);
      
      if (result.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Usuario no encontrado'
        };
      }
      
      const user = result.rows[0];
      
      return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        companyId: user.company_id,
        companyName: user.company_name,
        role: user.role,
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error obteniendo información de usuario:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error obteniendo información de usuario'
      };
    }
  }
  
  // Listar usuarios de una empresa
  async listUsers(companyId: number): Promise<{
    users: any[];
    responseCode: number;
    message: string;
  }> {
    try {
      const result = await query(`
        SELECT 
          id, 
          email, 
          full_name, 
          role, 
          status, 
          created_at
        FROM users
        WHERE company_id = $1 AND deleted_at IS NULL
        ORDER BY email
      `, [companyId]);
      
      const users = result.rows.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        createdAt: user.created_at
      }));
      
      return {
        users,
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error listando usuarios:', error);
      
      return {
        users: [],
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error listando usuarios'
      };
    }
  }
}

export const authService = new AuthService();
export default authService; 