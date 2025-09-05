#!/usr/bin/env bun

/**
 * Script interactivo para generar códigos QR usando API Key
 * Usa la API key: TUweJni7C6K2BmydcCUBlt2TAOpkIKbXJbeFtKy3
 */

import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const BASE_URL = 'http://localhost:3000';
const API_KEY = 'ZSkzucwhnRv5L0UhIqd5uwgKG35JghJ69iHti20E';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para imprimir con colores
function print(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Función para imprimir título
function printTitle() {
  console.clear();
  print('cyan', '╔══════════════════════════════════════════════════════════════╗');
  print('cyan', '║                    GENERADOR DE QR                          ║');
  print('cyan', '║                    CON API KEY                              ║');
  print('cyan', '╚══════════════════════════════════════════════════════════════╝');
  console.log();
}

// Función para validar entrada numérica
function validateNumber(input, min = 0, max = Infinity) {
  const num = parseFloat(input);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

// Función para validar fecha
function validateDate(input) {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

// Función para generar QR
async function generate(qrData) {
  try {
    print('yellow', '🔄 Generando código QR...');
    
    const response = await fetch(`${BASE_URL}/qr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(qrData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.message || 'Error desconocido'}`);
    }

    const result = await response.json();
    
    if (result.success) {
      print('green', '✅ QR generado exitosamente!');
      return result.data;
    } else {
      throw new Error(result.message || 'Error al generar QR');
    }
  } catch (error) {
    print('red', `❌ Error: ${error.message}`);
    return null;
  }
}

// Función para consultar estado de QR
async function checkQRStatus(qrId) {
  try {
    print('yellow', '🔍 Consultando estado del QR...');
    
    const response = await fetch(`${BASE_URL}/qr/${qrId}/status`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.message || 'Error desconocido'}`);
    }

    const result = await response.json();
    
    if (result.success) {
      print('green', '✅ Estado del QR consultado exitosamente!');
      return result.data;
    } else {
      throw new Error(result.message || 'Error al consultar estado');
    }
  } catch (error) {
    print('red', `❌ Error: ${error.message}`);
    return null;
  }
}

// Función para mostrar menú principal
function showMainMenu() {
  print('bright', '\n📋 MENÚ PRINCIPAL:');
  print('blue', '1. Generar nuevo código QR');
  print('blue', '2. Consultar estado de QR existente');
  print('blue', '3. Listar QRs recientes');
  print('blue', '4. Verificar permisos de API Key');
  print('red', '5. Salir');
  print('yellow', '\nSelecciona una opción (1-5):');
}

// Función para generar nuevo QR
async function handleGenerateQR() {
  printTitle();
  print('green', '🎯 GENERAR NUEVO CÓDIGO QR');
  print('blue', '══════════════════════════════════════════════════════════════');
  console.log();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Solicitar monto
    const amount = await new Promise((resolve) => {
      rl.question('💰 Ingresa el monto (ej: 100.50): ', (input) => {
        const num = validateNumber(input, 0.01);
        if (num) {
          resolve(num);
        } else {
          print('red', '❌ Monto inválido. Debe ser un número mayor a 0.');
          resolve(null);
        }
      });
    });

    if (!amount) return;

    // Solicitar moneda
    const currency = await new Promise((resolve) => {
      rl.question('💱 Ingresa la moneda (BOB, USD, EUR) [BOB]: ', (input) => {
        const curr = input.trim().toUpperCase() || 'BOB';
        if (['BOB', 'USD', 'EUR'].includes(curr)) {
          resolve(curr);
        } else {
          print('red', '❌ Moneda inválida. Usando BOB por defecto.');
          resolve('BOB');
        }
      });
    });

    // Solicitar descripción
    const description = await new Promise((resolve) => {
      rl.question('📝 Ingresa una descripción (opcional): ', (input) => {
        resolve(input.trim() || '');
      });
    });

    // Solicitar fecha de vencimiento
    const dueDate = await new Promise((resolve) => {
      rl.question('⏰ Fecha de vencimiento (YYYY-MM-DD HH:MM) [24h]: ', (input) => {
        if (input.trim()) {
          const date = validateDate(input);
          if (date) {
            resolve(date.toISOString());
          } else {
            print('red', '❌ Fecha inválida. Usando 24 horas por defecto.');
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    // Solicitar opciones adicionales
    const singleUse = await new Promise((resolve) => {
      rl.question('🔒 ¿QR de un solo uso? (s/n) [s]: ', (input) => {
        const answer = input.trim().toLowerCase();
        resolve(answer !== 'n');
      });
    });

    const modifyAmount = await new Promise((resolve) => {
      rl.question('✏️ ¿Permitir modificar monto? (s/n) [n]: ', (input) => {
        const answer = input.trim().toLowerCase();
        resolve(answer === 's');
      });
    });

    rl.close();

    // Preparar datos para la API
    const qrData = {
      transactionId: `TX-${Date.now()}`,
      amount: parseFloat(amount),
      description,
      dueDate: dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas por defecto
      singleUse,
      modifyAmount
    };

    print('blue', '\n📊 Datos del QR a generar:');
    console.log(JSON.stringify(qrData, null, 2));
    console.log();

    // Confirmar generación
    const confirm = await new Promise((resolve) => {
      const confirmRl = createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question('¿Confirmar generación? (s/n): ', (input) => {
        confirmRl.close();
        resolve(input.trim().toLowerCase() === 's');
      });
    });

    if (confirm) {
      const result = await generate(qrData);
      if (result) {
        print('green', '\n🎉 QR GENERADO EXITOSAMENTE!');
        print('blue', '══════════════════════════════════════════════════════════════');
        console.log(`QR ID: ${result.qrId}`);
        console.log(`Transaction ID: ${result.transactionId}`);
        console.log(`Monto: ${result.amount} ${result.currency}`);
        console.log(`Estado: ${result.status}`);
        console.log(`Fecha de creación: ${new Date(result.createdAt).toLocaleString()}`);
        if (result.dueDate) {
          console.log(`Fecha de vencimiento: ${new Date(result.dueDate).toLocaleString()}`);
        }
        console.log(`URL del QR: ${result.qrUrl || 'No disponible'}`);
      }
    } else {
      print('yellow', '❌ Generación cancelada.');
    }

  } catch (error) {
    print('red', `❌ Error: ${error.message}`);
  }
}

// Función para consultar estado de QR
async function handleCheckStatus() {
  printTitle();
  print('green', '🔍 CONSULTAR ESTADO DE QR');
  print('blue', '══════════════════════════════════════════════════════════════');
  console.log();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const qrId = await new Promise((resolve) => {
      rl.question('🔍 Ingresa el QR ID: ', (input) => {
        resolve(input.trim());
      });
    });

    rl.close();

    if (qrId) {
      const result = await checkQRStatus(qrId);
      if (result) {
        print('green', '\n📊 ESTADO DEL QR:');
        print('blue', '══════════════════════════════════════════════════════════════');
        console.log(`QR ID: ${result.qrId}`);
        console.log(`Transaction ID: ${result.transactionId}`);
        console.log(`Monto: ${result.amount} ${result.currency}`);
        console.log(`Estado: ${result.status}`);
        console.log(`Fecha de creación: ${new Date(result.createdAt).toLocaleString()}`);
        if (result.dueDate) {
          console.log(`Fecha de vencimiento: ${new Date(result.dueDate).toLocaleString()}`);
        }
        if (result.payments && result.payments.length > 0) {
          console.log(`\n💳 Pagos realizados: ${result.payments.length}`);
          result.payments.forEach((payment, index) => {
            console.log(`  ${index + 1}. ${payment.amount} ${payment.currency} - ${payment.status}`);
          });
        } else {
          console.log('\n💳 No hay pagos registrados');
        }
      }
    } else {
      print('red', '❌ QR ID requerido.');
    }
  } catch (error) {
    print('red', `❌ Error: ${error.message}`);
  }
}

// Función para listar QRs recientes
async function handleListQRs() {
  printTitle();
  print('green', '📋 LISTAR QRs RECIENTES');
  print('blue', '══════════════════════════════════════════════════════════════');
  console.log();

  try {
    print('yellow', '🔍 Consultando QRs recientes...');
    
    const response = await fetch(`${BASE_URL}/qr/list`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.message || 'Error desconocido'}`);
    }

    const result = await response.json();
    
    if (result.success && result.data.qrList) {
      const qrs = result.data.qrList;
      print('green', `✅ Se encontraron ${qrs.length} QRs:`);
      console.log();
      
      qrs.forEach((qr, index) => {
        print('blue', `📋 QR ${index + 1}:`);
        console.log(`  ID: ${qr.qrId}`);
        console.log(`  Monto: ${qr.amount} ${qr.currency || 'BOB'}`);
        console.log(`  Estado: ${qr.status}`);
        console.log(`  Fecha: ${new Date(qr.createdAt).toLocaleString()}`);
        console.log();
      });
    } else {
      print('yellow', 'ℹ️ No se encontraron QRs.');
    }
  } catch (error) {
    print('red', `❌ Error: ${error.message}`);
  }
}

// Función para verificar permisos de API Key
async function handleCheckPermissions() {
  printTitle();
  print('green', '🔑 VERIFICAR PERMISOS DE API KEY');
  print('blue', '══════════════════════════════════════════════════════════════');
  console.log();

  try {
    print('yellow', '🔍 Verificando permisos...');
    
         // Intentar generar un QR de prueba para verificar permisos
     const testData = {
       transactionId: `TEST-${Date.now()}`,
       amount: 1.00,
       description: 'Test de permisos',
       dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
       singleUse: true,
       modifyAmount: false
     };

    const response = await fetch(`${BASE_URL}/qr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      print('green', '✅ API Key válida con permisos de generación de QR');
      
      // Verificar otros permisos
      const statusResponse = await fetch(`${BASE_URL}/qr/test/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });

      if (statusResponse.ok) {
        print('green', '✅ Permiso de consulta de estado: ACTIVO');
      } else {
        print('yellow', '⚠️ Permiso de consulta de estado: NO DISPONIBLE');
      }

      const cancelResponse = await fetch(`${BASE_URL}/qr/test/cancel`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });

      if (cancelResponse.ok) {
        print('green', '✅ Permiso de cancelación: ACTIVO');
      } else {
        print('yellow', '⚠️ Permiso de cancelación: NO DISPONIBLE');
      }

    } else {
      print('red', '❌ API Key inválida o sin permisos suficientes');
    }
  } catch (error) {
    print('red', `❌ Error: ${error.message}`);
  }
}

// Función principal del menú
async function mainMenu() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  while (true) {
    printTitle();
    showMainMenu();

    const choice = await new Promise((resolve) => {
      rl.question('', (input) => {
        resolve(input.trim());
      });
    });

    switch (choice) {
      case '1':
        await handleGenerateQR();
        break;
      case '2':
        await handleCheckStatus();
        break;
      case '3':
        await handleListQRs();
        break;
      case '4':
        await handleCheckPermissions();
        break;
      case '5':
        print('green', '👋 ¡Hasta luego!');
        rl.close();
        process.exit(0);
        break;
      default:
        print('red', '❌ Opción inválida. Selecciona 1-5.');
    }

    if (choice !== '5') {
      print('yellow', '\nPresiona Enter para continuar...');
      await new Promise((resolve) => {
        rl.question('', resolve);
      });
    }
  }
}

// Función principal
async function main() {
  try {
    printTitle();
    print('green', '🚀 Iniciando Generador de QR con API Key...');
    print('blue', `🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);
    print('blue', `🌐 Servidor: ${BASE_URL}`);
    console.log();

    // Verificar conectividad del servidor
    try {
      const healthResponse = await fetch(`${BASE_URL}/health`);
      if (healthResponse.ok) {
        print('green', '✅ Servidor conectado y funcionando');
      } else {
        print('red', '❌ Servidor no responde correctamente');
        process.exit(1);
      }
    } catch (error) {
      print('red', `❌ No se puede conectar al servidor: ${error.message}`);
      print('yellow', '💡 Asegúrate de que el servidor esté ejecutándose en http://localhost:3000');
      process.exit(1);
    }

    console.log();
    await mainMenu();

  } catch (error) {
    print('red', `❌ Error inesperado: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.main) {
  main();
}
