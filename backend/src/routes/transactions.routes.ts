import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import transactionService from '../services/transaction.service';
import { ApiError } from '../utils/error';

const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any())
});
// Rutas para transacciones
export const transactionsRoutes = new Elysia({ prefix: '/transactions' })
  .use(authMiddleware({ type: 'all', level: 'user' }))
  
  // Obtener estadísticas de transacciones por período
  .get('/stats/:periodType/:year/:month?/:week?', async ({ params, auth }) => {
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
  
    const companyId = auth.user!.companyId;
    const userId = auth.user!.id;
    const periodType = params.periodType as 'weekly' | 'monthly' | 'yearly';
    const year = parseInt(params.year);
    const month = params.month ? parseInt(params.month) : undefined;
    const week = params.week ? parseInt(params.week) : undefined;
    
    const data = await transactionService.getTransactionStats(
      companyId,
      periodType,
      year,
      month,
      week,
      userId
    );
    return {
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data
    };
  }, {
    params: t.Object({
      periodType: t.Union([t.Literal('weekly'), t.Literal('monthly'), t.Literal('yearly')]),
      year: t.String(),
      month: t.Optional(t.String()),
      week: t.Optional(t.String())
    }),
    response: ResponseSchema,
    detail: {
      tags: ['transactions'],
      summary: 'Obtener estadísticas de transacciones por período'
    }
  })
  
  // Listar transacciones con filtros
  .get('/', async ({ query: queryParams, auth }) => {
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    const companyId = auth.user!.companyId;
    const userId = auth.user!.id;
    
    // Convertir parámetros de consulta
    const filters = {
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      status: queryParams.status,
      type: queryParams.type,
      minAmount: queryParams.minAmount !== undefined ? parseFloat(queryParams.minAmount) : undefined,
      maxAmount: queryParams.maxAmount !== undefined ? parseFloat(queryParams.maxAmount) : undefined,
      bankId: queryParams.bankId !== undefined ? parseInt(queryParams.bankId) : undefined,
      page: queryParams.page !== undefined ? parseInt(queryParams.page) : undefined,
      pageSize: queryParams.pageSize !== undefined ? parseInt(queryParams.pageSize) : undefined
    };
    
    const data = await transactionService.listTransactions(companyId, filters, userId);
    return {
      success: true,
      message: 'Transacciones listadas exitosamente',
      data
    };
  }, {
    query: t.Object({
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
      status: t.Optional(t.String()),
      type: t.Optional(t.String()),
      minAmount: t.Optional(t.String()),
      maxAmount: t.Optional(t.String()),
      bankId: t.Optional(t.String()),
      page: t.Optional(t.String()),
      pageSize: t.Optional(t.String())
    }),
    response: ResponseSchema,
    detail: {
      tags: ['transactions'],
      summary: 'Listar transacciones con filtros'
    }
  })
  
  // Crear una nueva transacción
  .post('/', async ({ body, auth }) => {
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    const companyId = auth.user!.companyId;
    const userId = auth.user!.id;
    
    const data = await transactionService.createTransaction(companyId, body as any, userId);
    return {
      success: true,
      message: 'Transacción creada exitosamente',
      data
    };
  }, {
    body: t.Object({
      qrId: t.Optional(t.String()),
      bankId: t.Optional(t.Number()),
      transactionId: t.String(),
      paymentDate: t.Optional(t.Any()),
      paymentTime: t.Optional(t.String()),
      currency: t.Optional(t.String()),
      amount: t.Number(),
      type: t.Union([t.Literal('incoming'), t.Literal('outgoing')]),
      senderName: t.Optional(t.String()),
      senderDocumentId: t.Optional(t.String()),
      senderAccount: t.Optional(t.String()),
      description: t.Optional(t.String()),
      metadata: t.Optional(t.Any()),
      status: t.Optional(t.String())
    }),
    response: ResponseSchema,
    detail: {
      tags: ['transactions'],
      summary: 'Crear una nueva transacción'
    }
  })
  
  // Obtener detalle de una transacción específica
  .get('/:id', async ({ params, auth }) => {
    if (auth?.type !== 'jwt') {
      throw new ApiError('Se requiere autenticación de usuario para esta operación', 401);
    }
    
    const companyId = auth.user!.companyId;
    const userId = auth.user!.id;
    const transactionId = params.id;
    
    const data = await transactionService.getTransactionDetail(companyId, transactionId, userId);
    return {
      success: true,
      message: 'Detalle de transacción obtenido exitosamente',
      data
    };
  }, {
    params: t.Object({
      id: t.String()
    }),
    response: ResponseSchema,
    detail: {
      tags: ['transactions'],
      summary: 'Obtener detalle de una transacción específica'
    }
  });

export default transactionsRoutes; 