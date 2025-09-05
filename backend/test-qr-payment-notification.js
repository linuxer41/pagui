/**
 * Script de prueba para la notificación de pago QR
 * 
 * Este script permite:
 * 1. Generar un código QR
 * 2. Enviar una notificación de pago al endpoint notifyPaymentQR
 * 3. Verificar que el QR ha cambiado su estado a PAID
 */

const fetch = require('node-fetch');
const { login } = require('./login-test');

// Configuración
const API_URL = 'http://localhost:8080'; // Cambia a la URL de tu API
let JWT_TOKEN = ''; // Se obtendrá automáticamente al hacer login

// Parámetros para el QR
const qrData = {
  transactionId: `TEST-${Date.now()}`,
  amount: 200.75,
  description: 'Prueba de notificación de pago',
  bankId: 1, // Banco Económico
  dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Mañana
  singleUse: true,
  modifyAmount: false
};

/**
 * Genera un QR
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
    
    return result.data;
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
 * Envía una notificación de pago al endpoint
 */
async function sendPaymentNotification(qrData) {
  console.log(`\nEnviando notificación de pago para QR: ${qrData.qrId}`);
  
  // Fecha y hora actual para la simulación del pago
  const now = new Date();
  const paymentDate = now.toISOString().split('.')[0]; // Formato: 2023-01-01T10:00:00
  const paymentTime = now.toTimeString().split(' ')[0]; // Formato: 10:00:00
  
  // Construir el objeto de pago según la especificación
  const paymentNotification = {
    payment: {
      qrId: qrData.qrId,
      transactionId: `BANK-${Date.now()}`,
      paymentDate: paymentDate,
      paymentTime: paymentTime,
      currency: "BOB", // o USD según corresponda
      amount: qrData.amount,
      senderBankCode: "1016", // Código de banco
      senderName: "CLIENTE PRUEBA",
      senderDocumentId: "0",
      senderAccount: "******1234",
      description: qrData.description || "Pago de prueba"
    }
  };
  
  try {
    const response = await fetch(`${API_URL}/qr/notifyPaymentQR`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentNotification)
    });

    const result = await response.json();
    console.log('Respuesta de notificación:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verificar respuesta correcta
    if (result.responseCode !== 0) {
      throw new Error(`Error en la respuesta: ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error al enviar notificación:', error.message);
    throw error;
  }
}

/**
 * Flujo completo de prueba
 */
async function runTest() {
  try {
    console.log('Iniciando prueba de notificación de pago QR...');
    
    // 0. Hacer login para obtener token
    console.log('\n=== PASO 0: Autenticación ===');
    const authData = await login();
    if (!authData) {
      throw new Error('No se pudo obtener el token JWT. Verifique las credenciales.');
    }
    JWT_TOKEN = authData.accessToken;
    console.log('✅ Autenticación exitosa!');
    
    // 1. Generar QR
    console.log('\n=== PASO 1: Generación de QR ===');
    const qrData = await generate();
    console.log(`✅ QR generado con ID: ${qrData.qrId}`);
    
    // 2. Verificar estado inicial (debe ser active)
    console.log('\n=== PASO 2: Verificación de estado inicial ===');
    const initialStatus = await checkQRStatus(qrData.qrId);
    console.log(`✅ Estado inicial: ${initialStatus.data.status}`);
    
    // 3. Enviar notificación de pago
    console.log('\n=== PASO 3: Envío de notificación de pago ===');
    const notificationResponse = await sendPaymentNotification(qrData);
    console.log('✅ Notificación enviada correctamente');
    
    // 4. Verificar estado final (debe ser PAID)
    console.log('\n=== PASO 4: Verificación de estado final ===');
    const finalStatus = await checkQRStatus(qrData.qrId);
    console.log(`Estado final: ${finalStatus.data.status}`);
    
    // 5. Verificar que el estado cambió a PAID
    if (finalStatus.data.status === 'PAID') {
      console.log('\n✅ PRUEBA EXITOSA: El QR se marcó como PAGADO');
    } else {
      console.log('\n❌ error: El estado del QR no cambió a PAID');
    }
  } catch (error) {
    console.error('\n❌ La prueba falló:', error.message);
  }
}

// Ejecutar la prueba
runTest();
