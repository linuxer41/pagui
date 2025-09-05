#!/usr/bin/env bun

/**
 * Script para ejecutar tests de API Keys
 * Ejecuta todas las pruebas relacionadas con la gestión de API keys
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Iniciando tests de API Keys...\n');

// Verificar que el servidor esté ejecutándose
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ Servidor está ejecutándose en http://localhost:3000');
      return true;
    }
  } catch (error) {
    console.log('❌ Servidor no está ejecutándose en http://localhost:3000');
    console.log('   Por favor, inicia el servidor antes de ejecutar los tests');
    return false;
  }
  return false;
}

// Ejecutar tests
async function runTests() {
  const testPath = join(__dirname, 'apikey', 'apikey.test.js');
  
  console.log(`📁 Ejecutando tests desde: ${testPath}\n`);
  
  const testProcess = spawn('bun', ['test', testPath, '--timeout', '30000'], {
    stdio: 'inherit',
    shell: true
  });

  testProcess.on('close', (code) => {
    console.log(`\n🏁 Tests completados con código de salida: ${code}`);
    
    if (code === 0) {
      console.log('🎉 ¡Todos los tests de API Keys pasaron exitosamente!');
    } else {
      console.log('💥 Algunos tests de API Keys fallaron');
      process.exit(code);
    }
  });

  testProcess.on('error', (error) => {
    console.error('❌ Error ejecutando tests:', error);
    process.exit(1);
  });
}

// Función principal
async function main() {
  try {
    const serverRunning = await checkServerHealth();
    
    if (!serverRunning) {
      console.log('\n💡 Para iniciar el servidor, ejecuta:');
      console.log('   bun run dev');
      console.log('   o');
      console.log('   bun run start\n');
      process.exit(1);
    }
    
    await runTests();
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.main) {
  main();
}
