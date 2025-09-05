#!/usr/bin/env bun

/**
 * Script para ejecutar pruebas específicas de códigos QR
 * Ejecuta todas las pruebas relacionadas con QR en secuencia
 */

import { spawn } from 'child_process';

async function runQRTests() {
  try {
    console.log('🧪 Iniciando pruebas de códigos QR...');
    console.log('📋 Pruebas incluidas:');
    console.log('  - Generación de QR');
    console.log('  - Verificación de estado');
    console.log('  - Listado y filtrado');
    console.log('  - Autenticación con API Key');
    console.log('  - Cancelación de QR');
    console.log('💾 Usando base de datos principal');
    
    console.log('🚀 Ejecutando pruebas de QR...');
    
    // Ejecutar las pruebas de QR con Bun
    const testProcess = spawn('bun', ['test', 'qr/'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_BASE_URL: 'http://localhost:3000'
      }
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('🎉 Todas las pruebas de QR pasaron exitosamente');
        console.log('✅ Funcionalidades verificadas:');
        console.log('   - Generación de códigos QR');
        console.log('   - Verificación de estado de QR');
        console.log('   - Listado y filtrado de QRs');
        console.log('   - Autenticación JWT y API Key');
        console.log('   - Cancelación de códigos QR');
        console.log('   - Manejo de errores y validaciones');
      } else {
        console.log(`❌ Algunas pruebas de QR fallaron (código de salida: ${code})`);
        process.exit(code);
      }
    });
    
    testProcess.on('error', (error) => {
      console.error('💥 Error ejecutando pruebas de QR:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('💥 Error ejecutando pruebas de QR:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  runQRTests();
}

export { runQRTests };
