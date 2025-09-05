/**
 * Script para hacer login y obtener un token JWT
 */

const fetch = require('node-fetch');

// Configuración
const API_URL = 'http://localhost:8080'; // Cambia a la URL de tu API

// Credenciales del usuario (del seed)
const email = 'admin@example.com';
const password = '1234';

/**
 * Hace login y devuelve el token JWT
 */
async function login() {
  try {
    console.log(`Iniciando sesión con el usuario: ${email}`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('Error al iniciar sesión:', result.message || response.statusText);
      return null;
    }

    console.log('Login exitoso!');
    console.log('Token JWT:', result.data.accessToken);
    
    return {
      accessToken: result.data.accessToken,
      userId: result.data.user.id,
      companyId: result.data.user.companyId
    };
  } catch (error) {
    console.error('Error en la solicitud:', error.message);
    return null;
  }
}

// Si este script se ejecuta directamente
if (require.main === module) {
  login().then(result => {
    if (result) {
      console.log('\nPara usar este token en los scripts de prueba, actualiza la variable JWT_TOKEN:');
      console.log(`const JWT_TOKEN = '${result.accessToken}';`);
      console.log('\nID de usuario:', result.userId);
      console.log('ID de empresa:', result.companyId);
    }
  });
}

module.exports = { login };
