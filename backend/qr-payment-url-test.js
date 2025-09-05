/**
 * Script para probar la generación de QR con URL de verificación
 * 
 * Este script permite:
 * 1. Generar un código QR
 * 2. Crear una URL de verificación de pago para compartir
 * 3. Simular un pago para ese QR
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

// Configuración
const API_URL = 'http://localhost:8080'; // Cambia a la URL de tu API
const JWT_TOKEN = 'TU_TOKEN_JWT'; // Reemplaza con un token JWT válido
const VERIFICATION_URL = 'https://tudominio.com/verificar'; // URL base para verificación

// Parámetros para el QR
const qrData = {
  transactionId: `TEST-${Date.now()}`,
  amount: 150.25,
  description: 'Prueba con URL de verificación',
  bankId: 1,
  dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  singleUse: true,
  modifyAmount: false
};

/**
 * Genera un token para verificación
 */
function generateVerificationToken(qrId, transactionId) {
  // Creamos un token simple con el qrId y transactionId
  const data = `${qrId}:${transactionId}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Genera un QR con URL de verificación
 */
async function generateQRWithVerificationURL() {
  console.log('Generando QR con URL de verificación...');
  try {
    // 1. Generar el QR
    const response = await fetch(`${API_URL}/qrsimple/generate`, {
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
    
    const qrId = result.data.qrId;
    
    // 2. Generar token de verificación
    const token = generateVerificationToken(qrId, qrData.transactionId);
    
    // 3. Crear URL de verificación
    const verificationUrl = `${VERIFICATION_URL}?qrId=${qrId}&token=${token}`;
    console.log('\nURL de verificación generada:');
    console.log(verificationUrl);
    
    return { qrId, token, verificationUrl };
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
    const response = await fetch(`${API_URL}/qrsimple/simulatePayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify({
        qrId,
        amount: qrData.amount,
        senderBankCode: '1016',
        senderName: 'Cliente de Prueba'
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
    const response = await fetch(`${API_URL}/qrsimple/${qrId}/status`, {
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
 * Simula la verificación de un QR a través de la URL
 */
async function simulateUrlVerification(qrId, token) {
  console.log(`\nSimulando verificación a través de URL para QR: ${qrId}`);
  console.log(`Con token: ${token}`);

  // Aquí normalmente se haría una petición GET a la URL de verificación
  // Para simular, usamos el endpoint de estado
  const status = await checkQRStatus(qrId);
  
  // Verificamos el token (en una implementación real se verificaría en el servidor)
  const isValidToken = token === generateVerificationToken(qrId, qrData.transactionId);
  
  console.log(`\nResultado de verificación:`);
  console.log(`- Token válido: ${isValidToken}`);
  console.log(`- Estado del QR: ${status.data.status}`);
  console.log(`- Pagado: ${status.data.status === 'PAID' ? 'SÍ' : 'NO'}`);
  
  return {
    isValid: isValidToken,
    isPaid: status.data.status === 'PAID',
    status: status.data
  };
}

/**
 * Flujo completo de prueba
 */
async function runTest() {
  try {
    // 1. Generar QR con URL de verificación
    const { qrId, token, verificationUrl } = await generateQRWithVerificationURL();
    
    // 2. Verificar estado inicial (debe ser active)
    await checkQRStatus(qrId);
    
    // 3. Simular acceso a la URL de verificación (antes del pago)
    await simulateUrlVerification(qrId, token);
    
    // 4. Simular pago
    await simulatePayment(qrId);
    
    // 5. Simular acceso a la URL de verificación (después del pago)
    await simulateUrlVerification(qrId, token);
    
    console.log('\n¡Prueba completada exitosamente!');
  } catch (error) {
    console.error('\nLa prueba falló:', error.message);
  }
}

// Ejecutar la prueba
runTest();
