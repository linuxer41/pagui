import { Elysia, t } from 'elysia';
import authService from '../services/auth.service';
import otpService from '../services/otp.service';

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
    try {
      console.log('body', body);
      
      // Obtener información del dispositivo
      const { ipAddress, userAgent } = getDeviceInfo(request);
      
      const response = await authService.authenticate(
        body.email, 
        body.password,
        ipAddress,
        userAgent
      );
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        user: {
          responseCode: 1,
          message: 'Error de autenticación'
        },
        auth: {
          accessToken: '',
          refreshToken: ''
        }
      };
    }
  }, {
    body: AuthRequestSchema,
    detail: {
      tags: ['auth'],
      summary: 'Autenticar usuario y obtener token JWT'
    }
  })
  
  .post('/register', async ({ body }) => {
    try {
      const response = await authService.createUser({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        companyId: body.companyId,
        role: 'USER' // Role por defecto
      });
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        responseCode: 1,
        message: 'Error al registrar usuario'
      };
    }
  }, {
    body: RegisterRequestSchema,
    detail: {
      tags: ['auth'],
      summary: 'Registrar un nuevo usuario'
    }
  })
  
  .post('/forgot-password', async ({ body, request }) => {
    try {
      // Obtener información del dispositivo
      const { ipAddress, userAgent } = getDeviceInfo(request);
      
      const response = await authService.requestPasswordReset(
        body.email,
        ipAddress,
        userAgent
      );
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        responseCode: 1,
        message: 'Error al solicitar restablecimiento de contraseña'
      };
    }
  }, {
    body: ForgotPasswordSchema,
    detail: {
      tags: ['auth'],
      summary: 'Solicitar restablecimiento de contraseña'
    }
  })
  
  .post('/reset-password', async ({ body, request }) => {
    try {
      // Obtener información del dispositivo
      const { ipAddress, userAgent } = getDeviceInfo(request);
      
      const response = await authService.resetPassword(
        body.token, 
        body.newPassword,
        ipAddress,
        userAgent
      );
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        responseCode: 1,
        message: 'Error al restablecer contraseña'
      };
    }
  }, {
    body: ResetPasswordSchema,
    detail: {
      tags: ['auth'],
      summary: 'Restablecer contraseña con token'
    }
  })
  
  .post('/change-password', async ({ body, request }) => {
    try {
      // Obtener el token JWT del encabezado Authorization
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          responseCode: 1,
          message: 'Usuario no autenticado'
        };
      }
      
      // Extraer el payload del JWT
      const token = authHeader.split(' ')[1];
      const decoded = await authService.decodeJwt(token);
      
      if (!decoded || !decoded.userId) {
        return {
          responseCode: 1,
          message: 'Token inválido o expirado'
        };
      }
      
      const response = await authService.changePassword(
        decoded.userId,
        body.currentPassword,
        body.newPassword
      );
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        responseCode: 1,
        message: 'Error al cambiar contraseña'
      };
    }
  }, {
    body: ChangePasswordSchema,
    detail: {
      tags: ['auth'],
      summary: 'Cambiar contraseña del usuario autenticado'
    }
  })
  
  .post('/send-otp', async ({ body, request }) => {
    try {
      // Verificar intentos recientes para prevenir spam
      const recentAttempts = await otpService.getRecentAttempts(body.phoneNumber, 5);
      if (recentAttempts >= 3) {
        return {
          success: false,
          message: 'Demasiados intentos recientes. Intente nuevamente en 5 minutos.'
        };
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
      
      const response = await otpService.sendOTP(body.phoneNumber, userId, companyId);
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        success: false,
        message: 'Error al enviar OTP'
      };
    }
  }, {
    body: SendOTPSchema,
    detail: {
      tags: ['auth'],
      summary: 'Enviar código OTP al número de teléfono'
    }
  })
  
  .post('/verify-otp', async ({ body, request }) => {
    try {
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
      
      const response = await otpService.verifyOTP(body.phoneNumber, body.code, userId, companyId);
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        success: false,
        message: 'Error al verificar OTP'
      };
    }
  }, {
    body: VerifyOTPSchema,
    detail: {
      tags: ['auth'],
      summary: 'Verificar código OTP'
    }
  })
  
  .get('/tokens', async ({ request }) => {
    try {
      // Obtener el token JWT del encabezado Authorization
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          responseCode: 1,
          message: 'Usuario no autenticado',
          tokens: []
        };
      }
      
      // Extraer el payload del JWT
      const token = authHeader.split(' ')[1];
      const decoded = await authService.decodeJwt(token);
      
      if (!decoded || !decoded.userId) {
        return {
          responseCode: 1,
          message: 'Token inválido o expirado',
          tokens: []
        };
      }
      
      // Obtener todos los tokens del usuario
      const response = await authService.getUserTokens(decoded.userId);
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        responseCode: 1,
        message: 'Error al obtener tokens',
        tokens: []
      };
    }
  }, {
    detail: {
      tags: ['auth'],
      summary: 'Obtener todos los tokens del usuario autenticado'
    }
  })
  
  .post('/revoke-token/:tokenId', async ({ params, request }) => {
    try {
      // Obtener el token JWT del encabezado Authorization
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          responseCode: 1,
          message: 'Usuario no autenticado'
        };
      }
      
      // Extraer el payload del JWT
      const token = authHeader.split(' ')[1];
      const decoded = await authService.decodeJwt(token);
      
      if (!decoded || !decoded.userId) {
        return {
          responseCode: 1,
          message: 'Token inválido o expirado'
        };
      }
      
      // Revocar el token específico
      const response = await authService.revokeToken(parseInt(params.tokenId));
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        responseCode: 1,
        message: 'Error al revocar token'
      };
    }
  }, {
    detail: {
      tags: ['auth'],
      summary: 'Revocar un token específico'
    }
  })
  
  .post('/revoke-all-tokens', async ({ request }) => {
    try {
      // Obtener el token JWT del encabezado Authorization
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          responseCode: 1,
          message: 'Usuario no autenticado'
        };
      }
      
      // Extraer el payload del JWT
      const token = authHeader.split(' ')[1];
      const decoded = await authService.decodeJwt(token);
      
      if (!decoded || !decoded.userId) {
        return {
          responseCode: 1,
          message: 'Token inválido o expirado'
        };
      }
      
      // Revocar todos los tokens del usuario
      const response = await authService.revokeAllUserTokens(decoded.userId);
      return response;
    } catch (error) {
      console.log('error', error);
      return {
        responseCode: 1,
        message: 'Error al revocar tokens'
      };
    }
  }, {
    detail: {
      tags: ['auth'],
      summary: 'Revocar todos los tokens del usuario autenticado'
    }
  });

export default authRoutes; 