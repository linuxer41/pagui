import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middlewares/auth.middleware';
import accountService from '../../services/account.service';
import userService from '../../services/user.service';
import { ApiError } from '../../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});

const CreateAccountSchema = t.Object({
  accountNumber: t.String(),
  accountType: t.String(),
  currency: t.String(),
  balance: t.Number(),
  availableBalance: t.Number(),
  thirdBankCredentialId: t.Optional(t.Number()),
  // Datos del usuario owner
  userEmail: t.String(),
  userFullName: t.String(),
  userPhone: t.Optional(t.String()),
  userAddress: t.Optional(t.String())
});

// Rutas de administración para cuentas
export const adminAccountRoutes = new Elysia({ prefix: '/admin/accounts' })
  .use(authMiddleware({ type: 'jwt', level: 'admin' }))
  
  // Listar todas las cuentas (solo admin)
  .get('/', async () => {
    try {
      const accounts = await accountService.getAllAccounts();
      
      return {
        success: true,
        data: accounts,
        message: 'Cuentas obtenidas exitosamente'
      };
    } catch (error) {
      console.error('Error obteniendo cuentas:', error);
      throw new ApiError('Error interno del servidor', 500);
    }
  }, {
    response: ResponseSchema,
    detail: {
      tags: ['admin', 'accounts'],
      summary: 'Listar todas las cuentas (solo admin)'
    }
  })
  
  // Crear una nueva cuenta con usuario owner
  .post('/', async ({ body }) => {
    try {
      const {
        accountNumber,
        accountType,
        currency,
        balance,
        availableBalance,
        thirdBankCredentialId,
        userEmail,
        userFullName,
        userPhone,
        userAddress
      } = body;
      
      // Verificar si el usuario ya existe
      let user = await userService.getUserByEmail(userEmail);
      
      if (!user) {
        // Crear el usuario si no existe
        user = await userService.createUser({
          password: '',
          email: userEmail,
          fullName: userFullName,
          phone: userPhone,
          address: userAddress,
          roleId: 2 // Role de usuario normal
        });
      }
      
      // Crear la cuenta
      const account = await accountService.createAccount(
        accountNumber,
        accountType,
        currency,
        balance,
        availableBalance,
        thirdBankCredentialId
      );
      
      // Asociar la cuenta al usuario como owner
      await accountService.associateUserToAccount(user.id, account.id, 'owner', true);
      
      return {
        success: true,
        data: {
          account,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName
          }
        },
        message: 'Cuenta creada exitosamente'
      };
    } catch (error) {
      console.error('Error creando cuenta:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Error interno del servidor', 500);
    }
  }, {
    body: CreateAccountSchema,
    response: ResponseSchema,
    detail: {
      tags: ['admin', 'accounts'],
      summary: 'Crear una nueva cuenta con usuario owner'
    }
  });

export default adminAccountRoutes;
