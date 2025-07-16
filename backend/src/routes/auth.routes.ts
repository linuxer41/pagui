import { Elysia, t } from 'elysia';
import authService from '../services/auth.service';

// Esquemas de validación
const AuthRequestSchema = t.Object({
  email: t.String(),
  password: t.String()
});

// Rutas de autenticación
export const authRoutes = new Elysia({ prefix: '/authentication' })
  .post('/authenticate', async ({ body }) => {
    try {
      console.log('body', body);
      const response = await authService.authenticate(body.email, body.password);
      return response;
    } catch (error) {
      console.log('error', error);

    }

  }, {
    body: AuthRequestSchema,
    detail: {
      tags: ['auth'],
      summary: 'Autenticar usuario y obtener token JWT'
    }
  })
  
  .get('/encrypt', async ({ query }) => {
    try {
      const { text, aesKey } = query;
      if (!text || !aesKey) {
        return {
          responseCode: 1,
          message: 'Parámetros text y aesKey son requeridos'
        };
      }
      return authService.encryptText(text, aesKey);
    } catch (error) {
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error de encriptación'
      };
    }
  }, {
    query: t.Object({
      text: t.String(),
      aesKey: t.String()
    }),
    detail: {
      tags: ['auth'],
      summary: 'Encriptar texto'
    }
  })
  
  .get('/decrypt', async ({ query }) => {
    try {
      const { text, aesKey } = query;
      if (!text || !aesKey) {
        return {
          responseCode: 1,
          message: 'Parámetros text y aesKey son requeridos'
        };
      }
      return authService.decryptText(text, aesKey);
    } catch (error) {
      return {
        responseCode: 1,
        message: error instanceof Error ? error.message : 'Error de desencriptación'
      };
    }
  }, {
    query: t.Object({
      text: t.String(),
      aesKey: t.String()
    }),
    detail: {
      tags: ['auth'],
      summary: 'Desencriptar texto'
    }
  });

export default authRoutes; 