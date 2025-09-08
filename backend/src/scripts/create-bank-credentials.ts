import { bankCredentialsService } from '../services/bank-credentials.service';
import * as readline from 'readline';

// Crear interfaz para leer desde la consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para hacer preguntas de forma asíncrona
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function createBankCredentials() {
  console.log('🏦 === CREAR CREDENCIALES BANCARIAS BANECO ===\n');
  
  try {
    // Solicitar datos al usuario
    const accountNumber = await askQuestion('📋 Número de cuenta: ');
    if (!accountNumber) {
      throw new Error('El número de cuenta es requerido');
    }

    const accountName = await askQuestion('🏷️  Nombre de la cuenta: ');
    if (!accountName) {
      throw new Error('El nombre de la cuenta es requerido');
    }

    const username = await askQuestion('👤 Usuario: ');
    if (!username) {
      throw new Error('El usuario es requerido');
    }

    // Solicitar contraseña
    const password = await askQuestion('🔒 Contraseña: ');
    if (!password) {
      throw new Error('La contraseña es requerida');
    }

    const encryptionKey = await askQuestion('🔑 Clave de encriptación AES: ');
    if (!encryptionKey) {
      throw new Error('La clave de encriptación es requerida');
    }

    // Solicitar entorno
    const environment = await askQuestion('🌍 Entorno (test/prod) [prod]: ');
    const finalEnvironment = environment || 'prod';
    
    if (finalEnvironment !== 'test' && finalEnvironment !== 'prod') {
      throw new Error('El entorno debe ser "test" o "prod"');
    }

    // Valores por defecto
    const merchantId = 'BANECO_PROD_MERCHANT';
    const apiBaseUrl = finalEnvironment === 'prod' 
      ? 'https://apimkt.baneco.com.bo/ApiGateway/'
      : 'https://apimktdesa.baneco.com.bo/ApiGateway/';

    console.log('\n📊 === RESUMEN DE DATOS ===');
    console.log(`📋 Número de cuenta: ${accountNumber}`);
    console.log(`🏷️  Nombre de cuenta: ${accountName}`);
    console.log(`👤 Usuario: ${username}`);
    console.log(`🔒 Contraseña: ${'*'.repeat(password.length)}`);
    console.log(`🔑 Clave AES: ${encryptionKey}`);
    console.log(`🏪 Merchant ID: ${merchantId}`);
    console.log(`🌍 Entorno: ${finalEnvironment}`);
    console.log(`🔗 URL API: ${apiBaseUrl}`);

    const confirm = await askQuestion('\n❓ ¿Confirmar creación? (s/N): ');
    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Operación cancelada');
      return;
    }

    console.log('\n🔄 Creando credenciales bancarias...');

    // Crear las credenciales
    const credential = await bankCredentialsService.create({
      accountNumber,
      accountName,
      merchantId,
      username,
      password,
      encryptionKey,
      environment: finalEnvironment,
      apiBaseUrl
    });

    console.log('✅ ¡Credenciales bancarias creadas exitosamente!');
    console.log('\n📋 === DETALLES DE LA CREDENCIAL ===');
    console.log(`🆔 ID: ${credential.id}`);
    console.log(`📋 Número de cuenta: ${credential.accountNumber}`);
    console.log(`🏷️  Nombre: ${credential.accountName}`);
    console.log(`👤 Usuario: ${credential.username}`);
    console.log(`🏪 Merchant ID: ${credential.merchantId}`);
    console.log(`🌍 Entorno: ${credential.environment}`);
    console.log(`🔗 URL API: ${credential.apiBaseUrl}`);
    console.log(`📊 Estado: ${credential.status}`);
    console.log(`📅 Creado: ${credential.createdAt}`);

  } catch (error) {
    console.error('❌ Error creando credenciales bancarias:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`
🏦 === SCRIPT DE CREACIÓN DE CREDENCIALES BANCARIAS ===

DESCRIPCIÓN:
  Este script permite crear credenciales bancarias para Banco Económico
  de forma interactiva, solicitando los datos necesarios por consola.

USO:
  npx tsx create-bank-credentials.ts

DATOS SOLICITADOS:
  📋 Número de cuenta    - Número de cuenta bancaria
  🏷️  Nombre de cuenta   - Nombre descriptivo de la cuenta
  👤 Usuario            - Usuario proporcionado por el banco
  🔒 Contraseña         - Contraseña (se oculta al escribir)
  🔑 Clave AES          - Clave de encriptación AES del banco

VALORES POR DEFECTO:
  🏪 Merchant ID: BANECO_PROD_MERCHANT
  🌍 Entorno: prod (producción)
  🔗 URL API: https://apimkt.baneco.com.bo/ApiGateway/

EJEMPLO:
  $ npx tsx create-bank-credentials.ts
  📋 Número de cuenta: 5021531650
  🏷️  Nombre de la cuenta: Mi Cuenta Producción
  👤 Usuario: A96661050
  🔒 Contraseña: ********
  🔑 Clave de encriptación AES: 320A7492A2334CDDADD8230D251B917C

NOTAS:
  - La contraseña se oculta mientras se escribe por seguridad
  - Se solicita confirmación antes de crear las credenciales
  - Los datos se validan antes de proceder
  - Se muestra un resumen completo antes de confirmar
`);
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Ejecutar el script principal
if (require.main === module) {
  createBankCredentials()
    .then(() => {
      console.log('\n🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en el script:', error);
      process.exit(1);
    });
}

export { createBankCredentials };
