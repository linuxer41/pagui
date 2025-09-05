import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import AccountService from '../services/account.service';
import TransactionService from '../services/transaction.service';

const router = Router();
const accountService = new AccountService();
const transactionService = new TransactionService();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

/**
 * @route GET /api/accounts
 * @desc Obtener todas las cuentas del usuario autenticado
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const accounts = await accountService.getUserAccounts(userId);
    
    res.json({
      success: true,
      data: accounts,
      message: 'Cuentas obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo cuentas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/accounts/:id
 * @desc Obtener una cuenta específica del usuario
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cuenta inválido'
      });
    }
    
    const account = await accountService.getUserAccount(userId, accountId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada o no tienes acceso'
      });
    }
    
    res.json({
      success: true,
      data: account,
      message: 'Cuenta obtenida exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/accounts/:id/balance
 * @desc Obtener balance actual de una cuenta
 * @access Private
 */
router.get('/:id/balance', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cuenta inválido'
      });
    }
    
    const balance = await accountService.getAccountBalance(accountId);
    
    res.json({
      success: true,
      data: balance,
      message: 'Balance obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/accounts/:id/movements
 * @desc Obtener historial de movimientos de una cuenta
 * @access Private
 */
router.get('/:id/movements', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const accountId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cuenta inválido'
      });
    }
    
    // Verificar acceso a la cuenta
    const account = await accountService.getUserAccount(userId, accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada o no tienes acceso'
      });
    }
    
    const offset = (page - 1) * limit;
    const movements = await accountService.getAccountMovements(accountId, limit, offset, startDate, endDate);
    
    res.json({
      success: true,
      data: movements,
      pagination: {
        page,
        limit,
        total: movements.length
      },
      message: 'Movimientos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/accounts/:id/movements
 * @desc Crear un nuevo movimiento en la cuenta
 * @access Private
 */
router.post('/:id/movements', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const accountId = parseInt(req.params.id);
    const { movementType, amount, description, referenceId, referenceType } = req.body;
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cuenta inválido'
      });
    }
    
    if (!movementType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de movimiento y monto son requeridos'
      });
    }
    
    // Verificar acceso a la cuenta
    const account = await accountService.getUserAccount(userId, accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada o no tienes acceso'
      });
    }
    
    const movementId = await accountService.createAccountMovement(
      accountId,
      movementType,
      amount,
      description,
      referenceId,
      referenceType
    );
    
    res.status(201).json({
      success: true,
      data: { movementId },
      message: 'Movimiento creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando movimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/accounts/:id/transfer
 * @desc Realizar transferencia desde una cuenta
 * @access Private
 */
router.post('/:id/transfer', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const fromAccountId = parseInt(req.params.id);
    const { toAccountId, amount, description } = req.body;
    
    if (isNaN(fromAccountId) || isNaN(toAccountId) || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Datos de transferencia inválidos'
      });
    }
    
    // Verificar acceso a la cuenta origen
    const fromAccount = await accountService.getUserAccount(userId, fromAccountId);
    if (!fromAccount) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta origen no encontrada o no tienes acceso'
      });
    }
    
    // Verificar acceso a la cuenta destino
    const toAccount = await accountService.getUserAccount(userId, toAccountId);
    if (!toAccount) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta destino no encontrada o no tienes acceso'
      });
    }
    
    await accountService.transferBetweenAccounts(fromAccountId, toAccountId, amount, description);
    
    res.json({
      success: true,
      message: 'Transferencia realizada exitosamente'
    });
  } catch (error) {
    console.error('Error realizando transferencia:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/accounts/:id/transactions
 * @desc Obtener transacciones de una cuenta específica
 * @access Private
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const accountId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cuenta inválido'
      });
    }
    
    // Verificar acceso a la cuenta
    const account = await accountService.getUserAccount(userId, accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada o no tienes acceso'
      });
    }
    
    const { transactions, total, totalPages } = await transactionService.listTransactions(
      userId,
      { accountId },
      page,
      pageSize
    );
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      },
      message: 'Transacciones obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo transacciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;
