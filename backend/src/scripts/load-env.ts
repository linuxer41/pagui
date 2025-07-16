import fs from 'node:fs';
import path from 'node:path';

/**
 * Script para cargar variables de entorno desde un archivo .env
 */
export function loadEnv() {
  try {
    // Ruta al archivo .env
    const envPath = path.join(process.cwd(), '.env');
    
    // Verificar si el archivo existe
    if (!fs.existsSync(envPath)) {
      console.warn('Archivo .env no encontrado. Usando valores predeterminados.');
      return;
    }
    
    // Leer el archivo .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Procesar cada línea
    const envVars = envContent.split('\n');
    
    for (const line of envVars) {
      // Ignorar líneas vacías o comentarios
      if (!line || line.startsWith('#')) continue;
      
      // Separar clave y valor
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('='); // Reunir el valor en caso de que tenga '='
      
      if (key && value) {
        // Establecer la variable de entorno
        process.env[key.trim()] = value.trim();
      }
    }
    
    console.log('Variables de entorno cargadas correctamente.');
  } catch (error) {
    console.error('Error al cargar variables de entorno:', error);
  }
}

// Si se ejecuta directamente, cargar las variables de entorno
if (require.main === module) {
  loadEnv();
  console.log('Variables de entorno disponibles:');
  
  // Mostrar algunas variables importantes (sin mostrar contraseñas)
  const safeVars = [
    'DATABASE_URL',
    'PORT',
    'HOST',
    'BANECO_API_URL',
    'BANECO_USERNAME',
    'BANECO_ACCOUNT',
    'CORS_ORIGIN'
  ];
  
  for (const key of safeVars) {
    if (process.env[key]) {
      console.log(`${key}=${process.env[key]}`);
    } else {
      console.log(`${key}=<no definido>`);
    }
  }
} 