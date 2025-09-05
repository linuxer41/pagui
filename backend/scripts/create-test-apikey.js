#!/usr/bin/env bun

/**
 * Script para crear una API key de prueba con permisos de QR
 * Usa el usuario admin@pagui.com
 */

import { TestUtils } from '../test/setup.js';

const BASE_URL = 'http://localhost:3000';

async function createTestApiKey() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    
    // Obtener token de admin
    const authToken = await TestUtils.getFreshAuthToken('create-test-apikey');
    
    console.log('✅ Token obtenido, creando API key...');
    
    // Crear API key con permisos de QR
    const apiKeyData = {
      description: 'API Key para pruebas de QR',
      permissions: {
        qr_generate: true,
        qr_status: true,
        qr_cancel: true
      }
    };

    const response = await fetch(`${BASE_URL}/apikeys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(apiKeyData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.message || 'Error desconocido'}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('🎉 API Key creada exitosamente!');
      console.log('══════════════════════════════════════════════════════════════');
      console.log(`ID: ${result.data.id}`);
      console.log(`API Key: ${result.data.apiKey}`);
      console.log(`Descripción: ${result.data.description}`);
      console.log(`Permisos:`, result.data.permissions);
      console.log(`Estado: ${result.data.status}`);
      console.log(`Usuario: ${result.data.userId}`);
      console.log('══════════════════════════════════════════════════════════════');
      console.log('\n💡 Copia esta API Key y úsala en el script generador de QR');
    } else {
      throw new Error(result.message || 'Error al crear API key');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.main) {
  createTestApiKey();
}
