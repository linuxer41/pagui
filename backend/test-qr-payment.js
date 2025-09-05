/**
 * Script de prueba para generación de QR y simulación de pagos
 * 
 * Uso:
 * 1. Configura las variables JWT_TOKEN y API_URL
 * 2. Ejecuta: node test-qr-payment.js
 */

const fetch = require('node-fetch');

// Configuración
const API_URL = 'http://localhost:8080'; // Cambia a la URL de tu API
const JWT_TOKEN = 'TU_TOKEN_JWT'; // Reemplaza con un token JWT válido

// Parámetros de prueba para el QR
const qrData = {
  transactionId: `TEST-${Date.now()}`,
  amount: 100.50,
  description: 'Prueba de QR y Pago',
  bankId: 1, // Banco Económico
  dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Mañana
  singleUse: true,
  modifyAmount: false
};

// Parámetros para simulación de pago
const paymentData = {
  amount: 100.50,
  senderBankCode: '1016', // Código del banco
  senderName: 'Cliente de Prueba'
};

/**
 * Genera un código QR
 */
async function generate() {
  console.log('Generando QR...');
  try {
    const response = await fetch(`${API_URL}/qr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify(qrData)
    });

    if (!response.ok) {
      throw new Error(`Error al generar QR: ${response.status}`);
    }

    const result = await response.json();
    console.log('QR generado exitosamente:');
    console.log(JSON.stringify(result, null, 2));
    
    // Devuelve el ID del QR para usarlo en la simulación de pago
    return result.data.qrId;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Simula un pago para un QR
 */
async function simulatePayment(qrId) {
  console.log(`\nSimulando pago para QR: ${qrId}`);
  try {
    const response = await fetch(`${API_URL}/qr/simulatePayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify({
        qrId,
        ...paymentData
      })
    });

    if (!response.ok) {
      throw new Error(`Error al simular pago: ${response.status}`);
    }

    const result = await response.json();
    console.log('Pago simulado exitosamente:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Verifica el estado de un QR
 */
async function checkQRStatus(qrId) {
  console.log(`\nVerificando estado del QR: ${qrId}`);
  try {
    const response = await fetch(`${API_URL}/qr/${qrId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al verificar estado: ${response.status}`);
    }

    const result = await response.json();
    console.log('Estado del QR:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Flujo completo de prueba: generar QR, verificar estado, simular pago, verificar estado final
 */
async function runTest() {
  try {
    // 1. Generar QR
    const qrId = await generate();
    
    // 2. Verificar estado inicial (debe ser active)
    await checkQRStatus(qrId);
    
    // 3. Simular pago
    await simulatePayment(qrId);
    
    // 4. Verificar estado final (debe ser PAID)
    await checkQRStatus(qrId);
    
    console.log('\n¡Prueba completada exitosamente!');
  } catch (error) {
    console.error('\nLa prueba falló:', error.message);
  }
}

// Ejecutar la prueba
runTest();
