import { query } from '../config/database';
import jwt from 'jsonwebtoken';
import { CryptoService } from './crypto.service';
import { logActivity } from './monitor.service';
import crypto from 'crypto';

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
  async authenticate(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{
    user: {
      userId?: number;
      companyId?: number;
      email?: string;
      fullName?: string;
      role?: string;
      responseCode: number;
      message: string;
    },
    company?: {
      id: number;
      name: string;
      businessId: string;
      contactEmail: string;
      status: string;
    },
    banks?: Array<{
      id: number;
      code: string;
      name: string;
      accountNumber?: string;
      accountUsername?: string;
      merchantId?: string;
      environment: number;
      status: string;
    }>,
    apiKeys?: Array<{
      id: number;
      apiKey: string;
      description: string;
      permissions: any;
      expiresAt: string;
      status: string;
    }>,
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
    const valid = await Bun.password.verify(password, user.password);
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

    // Guardar el access token en la base de datos
    await this.saveAuthToken(user.id, accessToken, 'ACCESS_TOKEN', `${TOKEN_EXPIRY}s`, ipAddress, userAgent);
    
    // Guardar el refresh token en la base de datos
    await this.saveAuthToken(user.id, refreshToken, 'REFRESH_TOKEN', '30d', ipAddress, userAgent);
    
    // Registrar actividad de login exitoso
    await logActivity(
      'USER_LOGIN',
      { 
        userId: user.id, 
        email: user.email,
        ipAddress,
        userAgent
      },
      'SUCCESS',
      user.company_id,
      user.id
    );

    // Obtener información de la empresa
    const companyQuery = await query(`
      SELECT id, name, business_id, contact_email, status 
      FROM companies 
      WHERE id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL
    `, [user.company_id]);
    
    const company = companyQuery.rowCount && companyQuery.rowCount > 0 ? {
      id: companyQuery.rows[0].id,
      name: companyQuery.rows[0].name,
      businessId: companyQuery.rows[0].business_id,
      contactEmail: companyQuery.rows[0].contact_email,
      status: companyQuery.rows[0].status
    } : undefined;

    // Obtener configuraciones de bancos para la empresa
    const banksQuery = await query(`
      SELECT 
        b.id, 
        b.code, 
        b.name, 
        cbc.account_number, 
        cbc.account_username, 
        cbc.merchant_id, 
        cbc.environment, 
        cbc.status
      FROM company_bank_configs cbc
      JOIN banks b ON cbc.bank_id = b.id
      WHERE cbc.company_id = $1 
      AND cbc.status = 'ACTIVE' 
      AND cbc.deleted_at IS NULL
      AND b.status = 'ACTIVE'
      AND b.deleted_at IS NULL
    `, [user.company_id]);

    const banks = banksQuery.rows.map(bank => ({
      id: bank.id,
      code: bank.code,
      name: bank.name,
      accountNumber: bank.account_number,
      accountUsername: bank.account_username,
      merchantId: bank.merchant_id,
      environment: bank.environment,
      status: bank.status
    }));

    // Obtener API keys de la empresa
    const apiKeysQuery = await query(`
      SELECT id, api_key, description, permissions, expires_at, status
      FROM api_keys
      WHERE company_id = $1 
      AND status = 'ACTIVE' 
      AND deleted_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    `, [user.company_id]);

    const apiKeys = apiKeysQuery.rows.map(key => ({
      id: key.id,
      apiKey: key.api_key,
      description: key.description,
      permissions: key.permissions,
      expiresAt: key.expires_at,
      status: key.status
    }));
    
    return {
      user: {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        responseCode: 0,
        message: 'Autenticación exitosa'
      },
      company,
      banks: banks.length > 0 ? banks : undefined,
      apiKeys: apiKeys.length > 0 ? apiKeys : undefined,
      auth: {
        accessToken,
        refreshToken
      }
    };
  }

  // Guardar token de autenticación
  private async saveAuthToken(
    userId: number,
    token: string,
    tokenType: string,
    expiresIn: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Calcular la fecha de expiración
    const expiryDate = new Date();
    const unit = expiresIn.charAt(expiresIn.length - 1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    if (unit === 'd') {
      expiryDate.setDate(expiryDate.getDate() + value);
    } else if (unit === 'h') {
      expiryDate.setHours(expiryDate.getHours() + value);
    } else if (unit === 'm') {
      expiryDate.setMinutes(expiryDate.getMinutes() + value);
    } else {
      // Si no se reconoce la unidad, asumimos segundos
      expiryDate.setSeconds(expiryDate.getSeconds() + parseInt(expiresIn, 10));
    }

    // Extraer información del dispositivo del user-agent
    let deviceInfo = 'Unknown Device';
    if (userAgent) {
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        deviceInfo = 'iOS Device';
      } else if (userAgent.includes('Android')) {
        deviceInfo = 'Android Device';
      } else if (userAgent.includes('Windows')) {
        deviceInfo = 'Windows Device';
      } else if (userAgent.includes('Mac OS')) {
        deviceInfo = 'Mac Device';
      } else if (userAgent.includes('Linux')) {
        deviceInfo = 'Linux Device';
      }
    }

    // Insertar en la tabla auth_tokens
    await query(`
      INSERT INTO auth_tokens 
      (user_id, token_type, token, expires_at, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tokenType, token, expiryDate, ipAddress || null, userAgent ? `${userAgent} | ${deviceInfo}` : null]
    );
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
      const isValidPassword = await Bun.password.verify(currentPassword, user.password);

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
      const hashedPassword = await Bun.password.hash(newPassword, {
        algorithm: 'bcrypt',
        cost: 10
      });

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

  // Solicitar restablecimiento de contraseña
  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string): Promise<{
    responseCode: number;
    message: string;
    token?: string; // Hacemos el token opcional para el tipo
  }> {
    try {
      // Verificar si el usuario existe
      const userResult = await query(
        'SELECT id, email, company_id FROM users WHERE email = $1 AND status = \'ACTIVE\' AND deleted_at IS NULL',
        [email]
      );

      if (userResult.rowCount === 0) {
        // No revelamos si el usuario existe o no por seguridad
        return {
          responseCode: 0,
          message: 'Si el correo existe, recibirá instrucciones para restablecer su contraseña'
        };
      }

      const user = userResult.rows[0];
      
      // Generar token aleatorio
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Guardar token en la base de datos
      await this.saveAuthToken(user.id, resetToken, 'PASSWORD_RESET', '24h', ipAddress, userAgent);
      
      // Aquí se enviaría un correo electrónico con el token
      // Por ahora solo registramos el evento
      await logActivity(
        'PASSWORD_RESET_REQUESTED',
        { userId: user.id, email: user.email, ipAddress, userAgent },
        'SUCCESS',
        user.company_id,
        user.id
      );

      return {
        responseCode: 0,
        message: 'Si el correo existe, recibirá instrucciones para restablecer su contraseña',
        // Solo para desarrollo, eliminar en producción:
        token: resetToken
      };
    } catch (error) {
      console.error('Error solicitando reset de contraseña:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error procesando solicitud'
      };
    }
  }

  // Restablecer contraseña con token
  async resetPassword(token: string, newPassword: string, ipAddress?: string, userAgent?: string): Promise<{
    responseCode: number;
    message: string;
  }> {
    try {
      // Buscar el token en la base de datos
      const tokenResult = await query(
        `SELECT auth_tokens.id, auth_tokens.user_id, auth_tokens.expires_at, auth_tokens.used_times,
                users.email, users.company_id
         FROM auth_tokens 
         JOIN users ON auth_tokens.user_id = users.id
         WHERE auth_tokens.token = $1 
         AND auth_tokens.token_type = 'PASSWORD_RESET'
         AND auth_tokens.deleted_at IS NULL
         AND users.status = 'ACTIVE'
         AND users.deleted_at IS NULL`,
        [token]
      );

      if (tokenResult.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Token inválido o expirado'
        };
      }

      const tokenData = tokenResult.rows[0];

      // Verificar si el token ya fue usado
      if (tokenData.used_times > 0) {
        return {
          responseCode: 1,
          message: 'Este token ya ha sido utilizado'
        };
      }

      // Verificar si el token ha expirado
      if (new Date(tokenData.expires_at) < new Date()) {
        return {
          responseCode: 1,
          message: 'El token ha expirado'
        };
      }

      // Hash de la nueva contraseña
      const hashedPassword = await Bun.password.hash(newPassword, {
        algorithm: 'bcrypt',
        cost: 10
      });

      // Actualizar contraseña
      await query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, tokenData.user_id]
      );

      // Incrementar el contador de usos del token
      await query(
        'UPDATE auth_tokens SET used_times = used_times + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [tokenData.id]
      );

      // Registrar cambio de contraseña exitoso
      await logActivity(
        'PASSWORD_RESET_COMPLETED',
        { userId: tokenData.user_id, ipAddress, userAgent },
        'SUCCESS',
        tokenData.company_id,
        tokenData.user_id
      );

      return {
        responseCode: 0,
        message: 'Contraseña restablecida exitosamente'
      };
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error restableciendo contraseña'
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
  
  // Decodificar token JWT
  decodeJwt(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('Error decodificando JWT:', error);
      return null;
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
      const hashedPassword = await Bun.password.hash(userData.password, {
        algorithm: 'bcrypt',
        cost: 10
      });
      
      // Insertar nuevo usuario
      const userResult = await query(
        `INSERT INTO users (
          email, password, full_name, company_id, role
        ) VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
        [
          userData.email,
          hashedPassword,
          userData.fullName,
          userData.companyId,
          userData.role
        ]
      );
      
      if (userResult.rowCount === 0) {
        return {
          responseCode: 1,
          message: 'Error al crear el usuario'
        };
      }
      
      const newUser = userResult.rows[0];
      
      // Registrar la creación del usuario
      await logActivity(
        'USER_CREATED',
        { 
          userId: newUser.id, 
          email: newUser.email,
          createdBy: creatorId || null
        },
        'SUCCESS',
        userData.companyId,
        creatorId
      );
      
      return {
        id: newUser.id,
        email: newUser.email,
        responseCode: 0,
        message: 'Usuario creado exitosamente'
      };
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error al crear el usuario'
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

  // Obtener todos los tokens de un usuario
  async getUserTokens(userId: number): Promise<{
    tokens: any[];
    responseCode: number;
    message: string;
  }> {
    try {
      const result = await query(`
        SELECT 
          id,
          token_type,
          token,
          expires_at,
          used_times,
          ip_address,
          user_agent,
          created_at
        FROM auth_tokens
        WHERE user_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
      `, [userId]);
      
      const tokens = result.rows.map(token => ({
        id: token.id,
        tokenType: token.token_type,
        token: token.token,
        expiresAt: token.expires_at,
        usedTimes: token.used_times,
        ipAddress: token.ip_address,
        userAgent: token.user_agent,
        createdAt: token.created_at
      }));
      
      return {
        tokens,
        responseCode: 0,
        message: ''
      };
    } catch (error) {
      console.error('Error obteniendo tokens de usuario:', error);
      
      return {
        tokens: [],
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error obteniendo tokens de usuario'
      };
    }
  }

  // Revocar un token específico
  async revokeToken(tokenId: number): Promise<{
    responseCode: number;
    message: string;
  }> {
    try {
      await query(`
        UPDATE auth_tokens 
        SET deleted_at = CURRENT_TIMESTAMP, used_times = used_times + 1
        WHERE id = $1
      `, [tokenId]);
      
      return {
        responseCode: 0,
        message: 'Token revocado exitosamente'
      };
    } catch (error) {
      console.error('Error revocando token:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error revocando token'
      };
    }
  }

  // Revocar todos los tokens de un usuario (logout de todos los dispositivos)
  async revokeAllUserTokens(userId: number): Promise<{
    responseCode: number;
    message: string;
  }> {
    try {
      await query(`
        UPDATE auth_tokens 
        SET deleted_at = CURRENT_TIMESTAMP, used_times = used_times + 1
        WHERE user_id = $1 AND deleted_at IS NULL
      `, [userId]);
      
      return {
        responseCode: 0,
        message: 'Todos los tokens revocados exitosamente'
      };
    } catch (error) {
      console.error('Error revocando tokens de usuario:', error);
      
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error revocando tokens de usuario'
      };
    }
  }
}

export const authService = new AuthService();
export default authService; 