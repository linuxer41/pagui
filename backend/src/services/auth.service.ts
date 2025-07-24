import { query } from '../config/database';
import jwt from 'jsonwebtoken';
import { CryptoService } from './crypto.service';
import { logActivity } from './monitor.service';
import crypto from 'crypto';
import { ApiError } from '../utils/error';
// Secreto para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Expiración del token en segundos (24 horas por defecto)
const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY || '86400', 10);

interface UserAuth {
  user: {
    userId: number;
    companyId: number;
    email: string;
    fullName: string;
    role: string;
  };
  company: {
    id: number;
    name: string;
    businessId: string;
    contactEmail: string;
    status: string;
  };
  auth: {
    accessToken: string;
    refreshToken: string;
  };
}

interface UserInfo {
  id: number;
  email: string;
  fullName: string;
  companyId: number;
  companyName?: string;
  role: string;
}

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Token {
  id: number;
  tokenType: string;
  token: string;
  expiresAt: string;
  usedTimes: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

class AuthService {
  private cryptoService: CryptoService;

  constructor() {
    // Inicializar el servicio de criptografía
    this.cryptoService = new CryptoService(process.env.CRYPTO_KEY || 'default-encryption-key');
  }

  // Autenticación de usuario
  async authenticate(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<UserAuth> {
    // Buscar usuario por email
    const userQuery = await query(`
      SELECT * FROM users WHERE email = $1 AND status = 'ACTIVE' AND deleted_at IS NULL`, [email]);
    if (userQuery.rowCount === 0) {
      throw new ApiError('Usuario no encontrado', 404);
    }
    const user = userQuery.rows[0];
    // Verificar contraseña
    const valid = await Bun.password.verify(password, user.password);
    if (!valid) {
      throw new ApiError('Contraseña incorrecta', 401);
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
      'INFO',
      user.company_id,
      user.id
    );

    // Obtener información de la empresa
    const companyQuery = await query(`
      SELECT id, name, business_id, contact_email, status 
      FROM companies 
      WHERE id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL
    `, [user.company_id]);
    
    if (companyQuery.rowCount === 0) {
      throw new ApiError('Empresa no encontrada', 404);
    }

    const company = {
      id: companyQuery.rows[0].id,
      name: companyQuery.rows[0].name,
      businessId: companyQuery.rows[0].business_id,
      contactEmail: companyQuery.rows[0].contact_email,
      status: companyQuery.rows[0].status
    };
    
    return {
      user: {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      company,
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
  ): Promise<void> {
    // Obtener usuario actual
    const userResult = await query(
      'SELECT id, email, password, company_id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (userResult.rowCount === 0) {
      throw new ApiError('Usuario no encontrado', 404);
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
      
      throw new ApiError('Contraseña actual incorrecta', 401);
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
      'INFO',
      user.company_id,
      userId
    );
  }

  // Solicitar restablecimiento de contraseña
  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string): Promise<{ token: string }> {
    // Verificar si el usuario existe
    const userResult = await query(
      'SELECT id, email, company_id FROM users WHERE email = $1 AND status = \'ACTIVE\' AND deleted_at IS NULL',
      [email]
    );

    if (userResult.rowCount === 0) {
      // No revelamos si el usuario existe o no por seguridad
      throw new ApiError('Si el correo existe, recibirá instrucciones para restablecer su contraseña', 404);
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
      'INFO',
      user.company_id,
      user.id
    );

    return { token: resetToken };
  }

  // Restablecer contraseña con token
  async resetPassword(token: string, newPassword: string, ipAddress?: string, userAgent?: string): Promise<void> {
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
      throw new ApiError('Token inválido o expirado', 400);
    }

    const tokenData = tokenResult.rows[0];

    // Verificar si el token ya fue usado
    if (tokenData.used_times > 0) {
      throw new ApiError('Este token ya ha sido utilizado', 400);
    }

    // Verificar si el token ha expirado
    if (new Date(tokenData.expires_at) < new Date()) {
      throw new ApiError('El token ha expirado', 400);
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
      'INFO',
      tokenData.company_id,
      tokenData.user_id
    );
  }

  // Encriptar un texto
  encryptText(text: string, aesKey: string): string {
    try {
      return this.cryptoService.encrypt(text, aesKey);
    } catch (error) {
      throw new ApiError('Error al encriptar el texto', 500);
    }
  }

  // Desencriptar un texto
  decryptText(encryptedText: string, aesKey: string): string {
    try {
      return this.cryptoService.decrypt(encryptedText, aesKey);
    } catch (error) {
      throw new ApiError('Error al desencriptar el texto', 500);
    }
  }
  
  // Decodificar token JWT
  decodeJwt(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new ApiError('Token inválido', 400);
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
  ): Promise<UserInfo> {
    // Verificar si el usuario ya existe
    const existingCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [userData.email]
    );
    
    if (existingCheck.rowCount && existingCheck.rowCount > 0) {
      throw new ApiError(`El usuario ${userData.email} ya existe`, 400);
    }
    
    // Verificar que la empresa exista
    const companyCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [userData.companyId]
    );
    
    if (companyCheck.rowCount === 0) {
      throw new ApiError('La empresa especificada no existe', 400);
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
      throw new ApiError('Error al crear el usuario', 500);
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
      'INFO',
      userData.companyId,
      creatorId
    );
    
    return {
      id: newUser.id,
      email: newUser.email,
      fullName: userData.fullName,
      companyId: userData.companyId,
      role: userData.role
    };
  }
  
  // Obtener información de un usuario
  async getUserInfo(email: string): Promise<UserInfo> {
    const result = await query(`
      SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.company_id, 
        c.name as company_name,
        r.name as role
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      INNER JOIN company_bank cb ON u.company_id = cb.company_id
      LEFT JOIN companies c ON cb.company_id = c.id
      WHERE u.email = $1 AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
    `, [email]);
    
    if (result.rowCount === 0) {
      throw new ApiError('Usuario no encontrado', 404);
    }
    
    const user = result.rows[0];
    
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyId: user.company_id,
      companyName: user.company_name,
      role: user.role,
    };
  }
  
  // Listar usuarios de una empresa
  async listUsers(companyId: number): Promise<User[]> {
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
    
    return result.rows.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    }));
  }

  // Obtener todos los tokens de un usuario
  async getUserTokens(userId: number): Promise<Token[]> {
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
    
    return result.rows.map(token => ({
      id: token.id,
      tokenType: token.token_type,
      token: token.token,
      expiresAt: token.expires_at,
      usedTimes: token.used_times,
      ipAddress: token.ip_address,
      userAgent: token.user_agent,
      createdAt: token.created_at
    }));
  }

  // Revocar un token específico
  async revokeToken(tokenId: number): Promise<void> {
    await query(`
      UPDATE auth_tokens 
      SET deleted_at = CURRENT_TIMESTAMP, used_times = used_times + 1
      WHERE id = $1
    `, [tokenId]);
  }

  // Revocar todos los tokens de un usuario (logout de todos los dispositivos)
  async revokeAllUserTokens(userId: number): Promise<void> {
    await query(`
      UPDATE auth_tokens 
      SET deleted_at = CURRENT_TIMESTAMP, used_times = used_times + 1
      WHERE user_id = $1 AND deleted_at IS NULL
    `, [userId]);
  }
}

const authService = new AuthService();
export {authService};