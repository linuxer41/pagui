import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import qrRoutes from './qr.routes';
import transactionRoutes from './transactions.routes';
import apikeyRoutes from './apikey.routes';
import adminRoutes from './admin/users.routes';
import publicRoutes from './public.routes';
import hooksRoutes from './hooks.route';
import accountRoutes from './accounts.routes';

const router = Router();

// Rutas públicas (sin autenticación)
router.use('/public', publicRoutes);
router.use('/hooks', hooksRoutes);

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de salud del sistema
router.use('/health', healthRoutes);

// Rutas protegidas (requieren autenticación)
router.use('/qr', qrRoutes);
router.use('/transactions', transactionRoutes);
router.use('/apikey', apikeyRoutes);
router.use('/accounts', accountRoutes);

// Rutas de administración
router.use('/admin', adminRoutes);

export default router;