/**
 * Configuración global para pruebas unitarias
 * Maneja la configuración de base de datos, autenticación y utilidades de prueba
 */

// Configuración de la aplicación
export const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
export const TIMEOUT = 30000; // 30 segundos para pruebas más robustas

// Configuración de base de datos principal (no de pruebas)
export const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/payments';

// Credenciales de prueba (usando la base de datos principal)
export const TEST_CREDENTIALS = {
  email: 'admin@pagui.com',
  password: 'admin123'
};

// Utilidades para pruebas
export class TestUtils {
  static authTokens = new Map();
  static testData = new Map();

  /**
   * Obtiene un token de autenticación fresco para cada prueba
   */
  static async getFreshAuthToken(testName) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Agregar un delay para evitar problemas de concurrencia
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`🔐 Intento ${attempt}/${maxRetries} de login para ${testName}...`);
        
        const response = await fetch(`${BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(TEST_CREDENTIALS),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.data && result.data.auth && result.data.auth.accessToken) {
          const token = result.data.auth.accessToken;
          this.authTokens.set(testName, token);
          console.log(`✅ Token obtenido para ${testName} en intento ${attempt}`);
          return token;
        } else {
          throw new Error(`Failed to authenticate for ${testName}: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        lastError = error;
        console.error(`❌ Error en intento ${attempt}/${maxRetries} para ${testName}:`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.error(`❌ Error final obteniendo token para ${testName} después de ${maxRetries} intentos:`, lastError);
    throw lastError;
  }

  /**
   * Crea datos únicos para cada prueba
   */
  static generateUniqueData(testName, type = 'default') {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    
    return {
      email: `${testName}_${type}_${timestamp}_${randomId}@test.com`,
      transactionId: `TEST-${testName.toUpperCase()}-${timestamp}-${randomId}`,
      description: `Test data for ${testName} - ${type}`,
      amount: 100 + (randomId % 900), // Entre 100 y 999
      qrId: null,
      apiKey: null,
      userId: null
    };
  }

  /**
   * Limpia los datos de prueba
   */
  static clearTestData() {
    // No limpiar tokens de autenticación para evitar problemas de concurrencia
    // this.authTokens.clear();
    this.testData.clear();
  }

  /**
   * Obtiene headers de autenticación para una prueba específica
   */
  static async getAuthHeaders(testName) {
    const token = await this.getFreshAuthToken(testName);
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  }

  /**
   * Hace una petición HTTP con manejo de errores
   */
  static async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        timeout: TIMEOUT,
        ...options
      });
      
      return response;
    } catch (error) {
      console.error(`Error en petición HTTP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Espera un tiempo específico (útil para pruebas asíncronas)
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Configuración global para todas las pruebas
export const TEST_CONFIG = {
  BASE_URL,
  TIMEOUT,
  TEST_CREDENTIALS,
  TEST_DATABASE_URL
};

// Nota: beforeEach debe ser llamado desde los archivos de test individuales
// export const setupTest = () => {
//   TestUtils.clearTestData();
// };
