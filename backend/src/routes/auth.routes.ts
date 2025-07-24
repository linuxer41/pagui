import { Elysia, t } from 'elysia';
import {authService} from '../services/auth.service';
import otpService from '../services/otp.service';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});

// Esquemas de validación
const AuthRequestSchema = t.Object({
  email: t.String(),
  password: t.String()
});

const RegisterRequestSchema = t.Object({
  email: t.String(),
  password: t.String(),
  fullName: t.String(),
  companyId: t.Number()
});

const ForgotPasswordSchema = t.Object({
  email: t.String()
});

const ResetPasswordSchema = t.Object({
  token: t.String(),
  newPassword: t.String()
});

const ChangePasswordSchema = t.Object({
  currentPassword: t.String(),
  newPassword: t.String()
});

const SendOTPSchema = t.Object({
  phoneNumber: t.String()
});

const VerifyOTPSchema = t.Object({
  phoneNumber: t.String(),
  code: t.String()
});

// Función auxiliar para obtener información del dispositivo
function getDeviceInfo(request: Request) {
  // Obtener dirección IP
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('cf-connecting-ip') || 
                    request.headers.get('x-real-ip') || 
                    request.headers.get('host') || 
                    'unknown';
  
  // Obtener user agent
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

// Rutas de autenticación
export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, request }) => {
    // Obtener información del dispositivo
    const { ipAddress, userAgent } = getDeviceInfo(request);
    
    const data = await authService.authenticate(
      body.email, 
      body.password,
      ipAddress,
      userAgent
    );
    return {
      success: true,
      message: 'Usuario autenticado exitosamente',
      data
    };
  }, {
    body: AuthRequestSchema,
    response: ResponseSchema,
    detail: {
      tags: ['auth'],
      summary: 'Autenticar usuario y obtener token JWT'
    }
  })

  .post('/forgot-password', async ({ body, request }) => {
    // Obtener información del dispositivo
    const { ipAddress, userAgent } = getDeviceInfo(request);
    
    const data = await authService.requestPasswordReset(
      body.email,
      ipAddress,
      userAgent
    );
    return {
      success: true,
      message: 'Se ha enviado un correo para restablecer la contraseña',
      data
    };
  }, {
    body: ForgotPasswordSchema,
    detail: {
      tags: ['auth'],
      summary: 'Solicitar restablecimiento de contraseña'
    }
  })
  
  .post('/reset-password', async ({ body, request }) => {
    // Obtener información del dispositivo
    const { ipAddress, userAgent } = getDeviceInfo(request);
    
    const data = await authService.resetPassword(
      body.token, 
      body.newPassword,
      ipAddress,
      userAgent
    );
    return {
      success: true,
      message: 'Contraseña restablecida exitosamente',
      data
    };
  }, {
    body: ResetPasswordSchema,
    detail: {
      tags: ['auth'],
      summary: 'Restablecer contraseña con token'
    }
  })
  
  .post('/change-password', async ({ body, request }) => {
    // Obtener el token JWT del encabezado Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Usuario no autenticado', 401);
    }
    
    // Extraer el payload del JWT
    const token = authHeader.split(' ')[1];
    const decoded = await authService.decodeJwt(token);
    
    if (!decoded || !decoded.userId) {
      throw new ApiError('Token inválido o expirado', 401);
    }
    
    const data = await authService.changePassword(
      decoded.userId,
      body.currentPassword,
      body.newPassword
    );
    return {
      success: true,
      message: 'Contraseña cambiada exitosamente',
      data
    };
  }, {
    body: ChangePasswordSchema,
    detail: {
      tags: ['auth'],
      summary: 'Cambiar contraseña del usuario autenticado'
    }
  })
  
  .post('/send-otp', async ({ body, request }) => {
    // Verificar intentos recientes para prevenir spam
    const recentAttempts = await otpService.getRecentAttempts(body.phoneNumber, 5);
    if (recentAttempts >= 3) {
      throw new ApiError('Demasiados intentos recientes. Intente nuevamente en 5 minutos.', 429);
    }
    
    // Obtener información del usuario si está autenticado
    let userId: number | undefined;
    let companyId: number | undefined;
    
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = await authService.decodeJwt(token);
      if (decoded) {
        userId = decoded.userId;
        companyId = decoded.companyId;
      }
    }
    
    const data = await otpService.sendOTP(body.phoneNumber, userId, companyId);
    return {
      success: true,
      message: 'Se ha enviado un código OTP al número de teléfono',
      data
    };
  }, {
    body: SendOTPSchema,
    detail: {
      tags: ['auth'],
      summary: 'Enviar código OTP al número de teléfono'
    }
  })
  
  .post('/verify-otp', async ({ body, request }) => {
    // Obtener información del usuario si está autenticado
    let userId: number | undefined;
    let companyId: number | undefined;
    
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = await authService.decodeJwt(token);
      if (decoded) {
        userId = decoded.userId;
        companyId = decoded.companyId;
      }
    }
    
    const data = await otpService.verifyOTP(body.phoneNumber, body.code, userId, companyId);
    return {
      success: true,
      message: 'Código OTP verificado exitosamente',
      data
    };
  }, {
    body: VerifyOTPSchema,
    detail: {
      tags: ['auth'],
      summary: 'Verificar código OTP'
    }
  })
  
  .get('/tokens', async ({ request }) => {
    // Obtener el token JWT del encabezado Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Usuario no autenticado', 401);
    }
    
    // Extraer el payload del JWT
    const token = authHeader.split(' ')[1];
    const decoded = await authService.decodeJwt(token);
    
    if (!decoded || !decoded.userId) {
      throw new ApiError('Token inválido o expirado', 401);
    }
    
    // Obtener todos los tokens del usuario
    const data = await authService.getUserTokens(decoded.userId);
    return {
      success: true,
      message: 'Se han obtenido todos los tokens del usuario autenticado',
      data
    };
  }, {
    detail: {
      tags: ['auth'],
      summary: 'Obtener todos los tokens del usuario autenticado'
    }
  })
  
  .post('/revoke-token/:tokenId', async ({ params, request }) => {
    // Obtener el token JWT del encabezado Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Usuario no autenticado', 401);
    }
    
    // Extraer el payload del JWT
    const token = authHeader.split(' ')[1];
    const decoded = await authService.decodeJwt(token);
    
    if (!decoded || !decoded.userId) {
      throw new ApiError('Token inválido o expirado', 401);
    }
    
    // Revocar el token específico
    const data = await authService.revokeToken(parseInt(params.tokenId));
    return {
      success: true,
      message: 'Token revocado exitosamente',
      data
    };
  }, {
    detail: {
      tags: ['auth'],
      summary: 'Revocar un token específico'
    }
  })
  
  .post('/revoke-all-tokens', async ({ request }) => {
    // Obtener el token JWT del encabezado Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Usuario no autenticado', 401);
    }
    
    // Extraer el payload del JWT
    const token = authHeader.split(' ')[1];
    const decoded = await authService.decodeJwt(token);
    
    if (!decoded || !decoded.userId) {
      throw new ApiError('Token inválido o expirado', 401);
    }
    
    // Revocar todos los tokens del usuario
    const data = await authService.revokeAllUserTokens(decoded.userId);
    return {
      success: true,
      message: 'Todos los tokens del usuario han sido revocados',
      data
    };
  }, {
    detail: {
      tags: ['auth'],
      summary: 'Revocar todos los tokens del usuario autenticado'
    }
  });

export default authRoutes; 