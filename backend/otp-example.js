// Ejemplo de uso del servicio OTP
// Este archivo muestra cómo usar las funciones de OTP

// Importar el servicio OTP (si estás usando Node.js)
// const { sendOTP, verifyOTP } = require('./otp.js');

// Configuración
const API_BASE_URL = 'http://localhost:3000'; // Ajusta según tu configuración
const PHONE_NUMBER = '+120688001xx'; // Reemplaza con un número real

/**
 * Ejemplo de envío de OTP
 */
async function sendOTPExample() {
  console.log('🚀 Enviando OTP...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: PHONE_NUMBER
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ OTP enviado exitosamente:', result.message);
      return result;
    } else {
      console.log('❌ Error enviando OTP:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en la petición:', error);
    return null;
  }
}

/**
 * Ejemplo de verificación de OTP
 */
async function verifyOTPExample(code) {
  console.log('🔍 Verificando OTP...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: PHONE_NUMBER,
        code: code
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ OTP verificado exitosamente:', result.message);
      return result;
    } else {
      console.log('❌ Error verificando OTP:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en la petición:', error);
    return null;
  }
}

/**
 * Ejemplo completo de flujo OTP
 */
async function completeOTPFlow() {
  console.log('📱 Iniciando flujo de verificación OTP...\n');
  
  // Paso 1: Enviar OTP
  const sendResult = await sendOTPExample();
  
  if (!sendResult) {
    console.log('❌ No se pudo enviar el OTP. Abortando...');
    return;
  }
  
  console.log('\n⏳ Esperando que el usuario ingrese el código...');
  
  // En una aplicación real, aquí esperarías a que el usuario ingrese el código
  // Por ahora, simulamos un código (en producción esto vendría del usuario)
  const userCode = '123456'; // Reemplazar con el código real que el usuario ingrese
  
  console.log(`🔢 Código ingresado: ${userCode}`);
  
  // Paso 2: Verificar OTP
  const verifyResult = await verifyOTPExample(userCode);
  
  if (verifyResult) {
    console.log('\n🎉 ¡Verificación OTP completada exitosamente!');
    console.log('El usuario puede continuar con el proceso...');
  } else {
    console.log('\n❌ La verificación OTP falló.');
    console.log('El usuario debe intentar nuevamente...');
  }
}

/**
 * Ejemplo con autenticación JWT
 */
async function sendOTPWithAuth() {
  console.log('🔐 Enviando OTP con autenticación...');
  
  // Primero necesitas obtener un token JWT (login)
  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'usuario@ejemplo.com',
      password: 'contraseña123'
    })
  });

  const loginResult = await loginResponse.json();
  
  if (!loginResult.auth?.accessToken) {
    console.log('❌ No se pudo autenticar');
    return;
  }

  // Enviar OTP con el token de autenticación
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginResult.auth.accessToken}`
      },
      body: JSON.stringify({
        phoneNumber: PHONE_NUMBER
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ OTP enviado exitosamente con autenticación:', result.message);
    } else {
      console.log('❌ Error enviando OTP:', result.message);
    }
  } catch (error) {
    console.error('❌ Error en la petición:', error);
  }
}

// Función para ejecutar ejemplos
async function runExamples() {
  console.log('=== Ejemplos de OTP ===\n');
  
  // Ejemplo 1: Flujo completo sin autenticación
  console.log('1️⃣ Flujo completo sin autenticación:');
  await completeOTPFlow();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Ejemplo 2: Con autenticación
  console.log('2️⃣ Envío con autenticación:');
  await sendOTPWithAuth();
}

// Ejecutar ejemplos si se ejecuta directamente
if (typeof window === 'undefined') {
  runExamples().catch(console.error);
}

// Exportar funciones para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendOTPExample,
    verifyOTPExample,
    completeOTPFlow,
    sendOTPWithAuth
  };
} 