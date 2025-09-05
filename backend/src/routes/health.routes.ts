import { Elysia, t } from 'elysia';

export default new Elysia({ prefix: '/health' })
  .get('/', () => {
    return {
      success: true,
      message: 'Servidor funcionando correctamente',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }, {
    detail: {
      tags: ['health'],
      summary: 'Verificar el estado del servidor'
    }
  })
  .get('/api', () => {
    return {
      success: true,
      message: 'API funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }, {
    detail: {
      tags: ['health'],
      summary: 'Verificar el estado de la API'
    }
  });
