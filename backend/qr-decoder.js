// qr-decoder.js - Decodificador de códigos QR de pago
import crypto from 'crypto';

/**
 * Decodifica un código QR de pago de Baneco
 * @param {string} qrData - Datos del código QR
 */
function decodePaymentQR(qrData) {
  try {
    console.log('🔍 Decodificando código QR de pago...');
    console.log('📋 Datos recibidos:', qrData);
    
    // Verificar si contiene el separador '|'
    if (!qrData.includes('|')) {
      console.log('❌ Formato inválido: No se encontró el separador "|"');
      return null;
    }
    
    const [jwtB64, tail] = qrData.split('|');
    console.log('🔑 JWT Base64:', jwtB64);
    console.log('🔗 Tail:', tail);
    
    // Limpiar el JWT para base64url
    const jwt = jwtB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    console.log('🧹 JWT limpio:', jwt);
    
    // Separar las partes del JWT
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      console.log('❌ JWT inválido: No tiene 3 partes');
      return null;
    }
    
    const [header, payload, signature] = parts;
    
    try {
      // Decodificar header
      const headerPadded = header + '==';
      const headerDecoded = Buffer.from(headerPadded, 'base64url').toString('utf8');
      const headerObj = JSON.parse(headerDecoded);
      console.log('📄 Header decodificado:', headerObj);
      
      // Decodificar payload
      const payloadPadded = payload + '==';
      const payloadDecoded = Buffer.from(payloadPadded, 'base64url').toString('utf8');
      const payloadObj = JSON.parse(payloadDecoded);
      console.log('📦 Payload decodificado:', payloadObj);
      
      return {
        header: headerObj,
        payload: payloadObj,
        signature: signature,
        tail: tail,
        raw: qrData
      };
      
    } catch (decodeError) {
      console.log('❌ Error decodificando JWT:', decodeError.message);
      
      // Intentar decodificar como datos binarios
      console.log('🔄 Intentando decodificación alternativa...');
      
      try {
        const binaryData = Buffer.from(qrData, 'base64');
        console.log('📊 Datos binarios (hex):', binaryData.toString('hex'));
        console.log('📊 Datos binarios (utf8):', binaryData.toString('utf8'));
        
        return {
          type: 'binary',
          data: binaryData,
          hex: binaryData.toString('hex'),
          utf8: binaryData.toString('utf8'),
          raw: qrData
        };
      } catch (binaryError) {
        console.log('❌ Error en decodificación binaria:', binaryError.message);
        return null;
      }
    }
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
    return null;
  }
}

/**
 * Analiza diferentes formatos de códigos QR
 */
function analyzeQRFormat(qrData) {
  console.log('\n🔍 Análisis del formato del código QR:');
  console.log('📏 Longitud:', qrData.length);
  console.log('🔤 Contiene "|":', qrData.includes('|'));
  console.log('🔤 Contiene ".":', qrData.includes('.'));
  console.log('🔤 Contiene "{":', qrData.includes('{'));
  console.log('🔤 Contiene "[":', qrData.includes('['));
  
  // Verificar si es base64 válido
  try {
    Buffer.from(qrData, 'base64');
    console.log('✅ Es base64 válido');
  } catch {
    console.log('❌ No es base64 válido');
  }
  
  // Verificar si es JSON válido
  try {
    JSON.parse(qrData);
    console.log('✅ Es JSON válido');
  } catch {
    console.log('❌ No es JSON válido');
  }
}

// Ejemplo de uso
const qrData = '8IiQJa2Qb0rDiBqia3+wUlONoAEpUv8BxgMUDnkcd7tQa0+m0Y+4oUyP14k8+px33IqIrh6qW2+YVs5JlDBDWKxcqCL6Y59blxqH8wgVJDZZ9d5dckemgmV/qikGT1YOqZjeR/lWgACfPJ08zdLlZb+1BhFcGUcYguuxUegmRJTbTGh8i4xF6D1tC9E77FrJWIrJuupCV3qZOvarS2MFMHu09gs5RTnMvI5TXP7bOGJbPlifRm+M7yUmNlVWDiDGvJXNgu1lq1/e70OjpYeXa76HeZK01W+eSWkjc5Ix3D5ARIg8g/vSoOAn59TJMZhtKVIKDWMBG1wbbdXXx/QHuw==';

console.log('🚀 Iniciando decodificación de código QR de pago...\n');

// Analizar formato
analyzeQRFormat(qrData);

// Decodificar
const result = decodePaymentQR(qrData);

if (result) {
  console.log('\n✅ Decodificación exitosa:');
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('\n❌ No se pudo decodificar el código QR');
}
