// Configuración de la API de UniMTX
const UNIMTX_API_URL = 'https://api.unimtx.com/';
const ACCESS_KEY_ID = 'PomrHUh51KFVELYGJhuEjh'; // Reemplazar con tu clave real

/**
 * Envía un código OTP al número de teléfono especificado
 * @param {string} phoneNumber - Número de teléfono en formato internacional (ej: +120688001xx)
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function sendOTP(phoneNumber) {
  try {
    const response = await fetch(`${UNIMTX_API_URL}?action=otp.send&accessKeyId=${ACCESS_KEY_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error enviando OTP:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica un código OTP
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} code - Código OTP a verificar
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function verifyOTP(phoneNumber, code) {
  try {
    const response = await fetch(`${UNIMTX_API_URL}?action=otp.verify&accessKeyId=${ACCESS_KEY_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error verificando OTP:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ejemplo de uso
 */
async function example() {
  const phoneNumber = '+59175434250'; // Reemplazar con el número real
  
  console.log('Enviando OTP...');
  const sendResult = await sendOTP(phoneNumber);
  
  if (sendResult.success) {
    console.log('OTP enviado exitosamente:', sendResult.data);
    
    // Simular verificación (en una aplicación real, el usuario ingresaría el código)
    const code = '123456'; // Código que el usuario ingresaría
    console.log('Verificando código OTP...');
    
    const verifyResult = await verifyOTP(phoneNumber, code);
    if (verifyResult.success) {
      console.log('OTP verificado exitosamente:', verifyResult.data);
    } else {
      console.log('Error verificando OTP:', verifyResult.error);
    }
  } else {
    console.log('Error enviando OTP:', sendResult.error);
  }
}

// Exportar funciones para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendOTP,
    verifyOTP
  };
}

// Ejecutar ejemplo si se ejecuta directamente
if (typeof window === 'undefined') {
  example();
} 