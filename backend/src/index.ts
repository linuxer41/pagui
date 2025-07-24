import { cors } from '@elysiajs/cors';
import { cron } from '@elysiajs/cron';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';

// Servicios
import { initScheduledTasks } from './services/monitor.service';
import qrService from './services/qr.service';

// Config y middlewares
import { migrateDB, testConnection, query } from './config/database';

// Rutas
import { routes } from './routes';
import { seedDatabase } from './scripts/seed-db';
import { ApiError } from './utils/error';

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
        { name: 'api-keys', description: 'Endpoints para gestión de API keys' },
        { name: 'transactions', description: 'Endpoints para gestión de transacciones' }
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
  .error(
    {ApiError}
  )
  .onError(({ code, error, set }) => {
    console.log({code});
    
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: error.message
      };
    }
    if (error instanceof ApiError) {
      set.status = error.statusCode;
      return {
        success: false,
        message: error.message
      };
    }
    set.status = 500;
    return {
      success: false,
      message: 'Internal Server Error'
    };
  });

// Ruta de estado del sistema
app.get('/', () => ({
  status: 'online',
  timestamp: new Date().toISOString(),
  auth_provider: 'zitadel'
}));

// Usar todas las rutas modularizadas
app.use(routes);

// Inicializar base de datos y servidor
async function start() {
  try {
    // Obtener argumentos de línea de comandos (el primer argumento es node, el segundo es el archivo)
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase();

    console.log(command);

    // Probar conexión a la base de datos
    await testConnection();
    
    // Ejecutar comandos específicos basados en argumentos
    if (command === 'init-db' || command === 'create-db') {
      console.log('🗄️ Inicializando la base de datos...');
      await migrateDB();
      process.exit(0);
    }
    
    if (command === 'seed') {
      console.log('🌱 Ejecutando seed de la base de datos...');
      await migrateDB(); // Aseguramos que la DB está inicializada antes de hacer seed
      await seedDatabase();
      process.exit(0);
    }
    
    // Flujo normal de inicio del servidor (sin argumentos específicos)
    if (!command) {
      // Iniciar tareas programadas
      initScheduledTasks();
      
      // Iniciar servidor
      app.listen(PORT);
      console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
      console.log(`📚 Documentación de la API disponible en http://localhost:${PORT}/swagger`);
    } else {
      console.log(`❌ Comando desconocido: ${command}`);
      console.log('Comandos disponibles: init-db, seed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error iniciando la aplicación:', error);
    process.exit(1);
  }
}

start();

