import fs from 'node:fs';
import path from 'node:path';

/**
 * Script para generar archivos .env para el proyecto
 * Ejecutar con: bun run src/scripts/create-env.ts
 */

// Contenido del archivo .env para el backend
const backendEnv = `# Configuración de la base de datos
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payments

# Configuración de JWT
JWT_SECRET=cambiar_por_secreto_seguro
JWT_EXPIRATION=24h

# Configuración del servidor
PORT=3000
HOST=0.0.0.0

# Configuración de encriptación (Banco Económico)
ENCRYPTION_KEY=6F09E3167E1D40829207B01041A65B12

# Configuración de CORS
CORS_ORIGIN=http://localhost:5173

# Configuración de Banco Económico
BANECO_API_URL=https://apimktdesa.baneco.com.bo/ApiGateway/
BANECO_USERNAME=1649710
BANECO_PASSWORD=1234
BANECO_ACCOUNT=1041070599
`;

// Contenido del archivo .env para el frontend
const frontendEnv = `VITE_API_URL=http://localhost:3000/api
`;

// Función para crear un archivo .env
function createEnvFile(filePath: string, content: string) {
  try {
    // Verificar si el archivo ya existe
    if (fs.existsSync(filePath)) {
      console.log(`El archivo ${filePath} ya existe. No se sobrescribirá.`);
      return;
    }
    
    // Crear el archivo
    fs.writeFileSync(filePath, content);
    console.log(`Archivo ${filePath} creado correctamente.`);
  } catch (error) {
    console.error(`Error al crear el archivo ${filePath}:`, error);
  }
}

// Crear los archivos .env
function createEnvFiles() {
  // Ruta del backend
  const backendPath = path.join(process.cwd(), '.env');
  createEnvFile(backendPath, backendEnv);
  
  // Ruta del frontend
  const frontendPath = path.join(process.cwd(), '..', 'frontend', '.env');
  createEnvFile(frontendPath, frontendEnv);
  
  console.log('Proceso completado.');
}

// Ejecutar la función
createEnvFiles(); 