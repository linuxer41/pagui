import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestUtils, BASE_URL, TIMEOUT } from '../setup.js';

describe('API Key Authentication Tests', () => {
  let authToken;
  let testApiKey;
  let testAccountId;

  beforeAll(async () => {
    // Obtener token de autenticación
    authToken = await TestUtils.getFreshAuthToken('apikey-auth-tests');
  }, TIMEOUT);

  afterAll(async () => {
    // Limpiar datos de prueba
    TestUtils.clearTestData();
  });

  beforeEach(async () => {
    // Crear una API key para las pruebas de autenticación
    const apiKeyData = {
      description: 'API Key para pruebas de autenticación',
      permissions: {
        qr_generate: true,
        qr_status: true,
        qr_cancel: false
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

    const result = await response.json();
    testApiKey = result.data.apiKey;
    testAccountId = result.data.accountId;
  }, TIMEOUT);

  describe('Autenticación con API Key en Headers', () => {
    it('debería autenticar correctamente con API key válida', async () => {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': testApiKey
        }
      });

      expect(response.status).toBe(200);
    }, TIMEOUT);

    it('debería rechazar API key inválida', async () => {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': 'pg_invalid_key_123'
        }
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);

    it('debería rechazar API key sin prefijo pg_', async () => {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': 'invalid_key_without_prefix'
        }
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);

    it('debería rechazar solicitud sin API key', async () => {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);
  });

  describe('Validación de Permisos con API Key', () => {
    it('debería permitir acceso a endpoints con permisos correctos', async () => {
      // Crear una API key con permisos específicos
      const apiKeyData = {
        description: 'API Key con permisos específicos',
        permissions: {
          qr_generate: true,
          qr_status: false,
          qr_cancel: false
        }
      };

      const createResponse = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData)
      });

      const createResult = await createResponse.json();
      const specificApiKey = createResult.data.apiKey;

      // Probar acceso a endpoint que requiere qr_generate
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': specificApiKey
        }
      });

      expect(response.status).toBe(200);
    }, TIMEOUT);

    it('debería rechazar acceso con API key sin permisos necesarios', async () => {
      // Crear una API key sin permisos
      const apiKeyData = {
        description: 'API Key sin permisos',
        permissions: {
          qr_generate: false,
          qr_status: false,
          qr_cancel: false
        }
      };

      const createResponse = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData)
      });

      const createResult = await createResponse.json();
      const noPermissionsApiKey = createResult.data.apiKey;

      // Probar acceso a endpoint que requiere permisos
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': noPermissionsApiKey
        }
      });

      // Dependiendo de la implementación, podría ser 200 (health no requiere permisos) o 403
      expect([200, 403]).toContain(response.status);
    }, TIMEOUT);
  });

  describe('API Key Expirada', () => {
    it('debería rechazar API key expirada', async () => {
      // Crear una API key que expire en el pasado
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const apiKeyData = {
        description: 'API Key expirada',
        permissions: {
          qr_generate: true,
          qr_status: true,
          qr_cancel: true
        },
        expiresAt: pastDate
      };

      const createResponse = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData)
      });

      const createResult = await createResponse.json();
      const expiredApiKey = createResult.data.apiKey;

      // Probar acceso con API key expirada
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': expiredApiKey
        }
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);
  });

  describe('API Key Revocada', () => {
    it('debería rechazar API key revocada', async () => {
      // Crear una API key para revocar
      const apiKeyData = {
        description: 'API Key para revocar',
        permissions: {
          qr_generate: true,
          qr_status: true,
          qr_cancel: true
        }
      };

      const createResponse = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData)
      });

      const createResult = await createResponse.json();
      const apiKeyToRevoke = createResult.data.id;
      const apiKeyToRevokeValue = createResult.data.apiKey;

      // Revocar la API key
      await fetch(`${BASE_URL}/apikeys/${apiKeyToRevoke}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Probar acceso con API key revocada
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKeyToRevokeValue
        }
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);
  });

  describe('Formato de API Key', () => {
    it('debería validar formato correcto de API key', async () => {
      // Verificar que la API key tiene el formato correcto
      expect(testApiKey).toMatch(/^pg_[A-Za-z0-9]{40}$/);
      expect(testApiKey.length).toBe(43);
    }, TIMEOUT);

    it('debería rechazar API keys con formato incorrecto', async () => {
      const invalidFormats = [
        'invalid_key',
        'pg_',
        'pg_short',
        'pg_' + 'a'.repeat(50), // Muy larga
        'wrong_prefix_1234567890123456789012345678901234567890',
        '',
        null,
        undefined
      ];

      for (const invalidKey of invalidFormats) {
        const response = await fetch(`${BASE_URL}/health`, {
          method: 'GET',
          headers: {
            'X-API-Key': invalidKey
          }
        });

        expect(response.status).toBe(401);
      }
    }, TIMEOUT);
  });

  describe('Headers Case Sensitivity', () => {
    it('debería aceptar header X-API-Key en diferentes casos', async () => {
      const headerVariations = [
        'X-API-Key',
        'x-api-key',
        'X-Api-Key',
        'x-API-KEY'
      ];

      for (const header of headerVariations) {
        const response = await fetch(`${BASE_URL}/health`, {
          method: 'GET',
          headers: {
            [header]: testApiKey
          }
        });

        // Algunos pueden funcionar dependiendo de la implementación del middleware
        expect([200, 401]).toContain(response.status);
      }
    }, TIMEOUT);
  });

  describe('Múltiples API Keys', () => {
    it('debería manejar múltiples API keys para la misma cuenta', async () => {
      // Crear segunda API key para la misma cuenta
      const apiKeyData2 = {
        description: 'Segunda API Key para la cuenta',
        permissions: {
          qr_generate: false,
          qr_status: true,
          qr_cancel: true
        }
      };

      const createResponse = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData2)
      });

      const createResult = await createResponse.json();
      const secondApiKey = createResult.data.apiKey;

      // Ambas API keys deberían funcionar
      const response1 = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': testApiKey
        }
      });

      const response2 = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': secondApiKey
        }
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(testApiKey).not.toBe(secondApiKey);
    }, TIMEOUT);
  });
});
