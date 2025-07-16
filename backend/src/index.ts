import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { cron } from '@elysiajs/cron';

// Servicios
import qrService from './services/qr.service';
import { initScheduledTasks } from './services/monitor.service';

// Config y middlewares
import { initDatabase, testConnection } from './config/database';

// Rutas
import { routes } from './routes';
import authRoutes from './routes/auth.routes';

// Variables de entorno
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Inicializar la aplicación
const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'API de Pagos con QR',
        version: '1.0.0',
        description: 'API para generación y gestión de códigos QR de pago'
      },
      tags: [
        { name: 'auth', description: 'Endpoints de autenticación' },
        { name: 'qr', description: 'Endpoints para gestión de códigos QR' },
        { name: 'admin', description: 'Endpoints de administración' },
        { name: 'companies', description: 'Endpoints para gestión de empresas' },
        { name: 'banks', description: 'Endpoints para gestión de bancos' },
        { name: 'api-keys', description: 'Endpoints para gestión de API keys' }
      ]
      
    },
    provider: 'swagger-ui',
  }))
  .use(cors({
    origin: () => true,
    credentials: true,
    methods: "*",
  }))
  .use(cron({
    name: 'monitor-tasks',
    pattern: '0 * * * *', // Cada hora
    run() {
      console.log('⏰ Running scheduled monitoring tasks');
      qrService.updateExpiredQRs();
      qrService.checkExpiringQRs();
    }
  }))
  .onError(({ code, error, set }) => {
    console.error(`Error: ${code}`, error);
    
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        responseCode: 1,
        message: error.message
      };
    }
    
    set.status = 500;
    return {
      responseCode: 1,
      message: 'Internal Server Error'
    };
  });

// Ruta de estado del sistema
app.get('/', () => ({
  status: 'online',
  timestamp: new Date().toISOString()
}));

// Usar todas las rutas modularizadas
app.use(routes);

// Inicializar base de datos y servidor
async function start() {
  try {
    // Probar conexión a la base de datos
    await testConnection();
    
    // Inicializar la base de datos
    await initDatabase();
    
    // Iniciar tareas programadas
    initScheduledTasks();
    
    // Iniciar servidor
    app.listen(PORT);
    console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
    console.log(`📚 Documentación de la API disponible en http://localhost:${PORT}/swagger`);
  } catch (error) {
    console.error('Error iniciando la aplicación:', error);
    process.exit(1);
  }
}

start();
