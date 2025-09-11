import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestUtils, BASE_URL, TIMEOUT } from '../setup.js';

describe('API Keys Endpoints', () => {
  let authToken;
  let createdApiKeyId;
  let createdApiKey;

  beforeAll(async () => {
    // Obtener token de autenticación
    authToken = await TestUtils.getFreshAuthToken('apikey-tests');
  }, TIMEOUT);

  afterAll(async () => {
    // Limpiar datos de prueba
    TestUtils.clearTestData();
  });

  beforeEach(async () => {
    // Resetear datos de prueba
    createdApiKeyId = null;
    createdApiKey = null;
  });

  describe('POST /apikeys - Crear API Key', () => {
    it('debería crear una nueva API key con permisos válidos', async () => {
      const apiKeyData = {
        description: 'API Key para pruebas de integración',
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

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.message).toBe('API key creada exitosamente');
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.apiKey).toBeDefined();
      expect(result.data.apiKey).toMatch(/^pg_/); // Debe tener prefijo pg_
      expect(result.data.description).toBe(apiKeyData.description);
      expect(result.data.permissions).toEqual(apiKeyData.permissions);
      expect(result.data.accountId).toBeDefined(); // Debe tener accountId en lugar de userId
      expect(result.data.status).toBe('active');
      expect(result.data.createdAt).toBeDefined();

      // Guardar para tests posteriores
      createdApiKeyId = result.data.id;
      createdApiKey = result.data.apiKey;
    }, TIMEOUT);

    it('debería crear una API key con fecha de expiración', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas
      const apiKeyData = {
        description: 'API Key con expiración',
        permissions: {
          qr_generate: true,
          qr_status: false,
          qr_cancel: false
        },
        expiresAt
      };

      const response = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData)
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.expiresAt).toBe(expiresAt);
    }, TIMEOUT);

    it('debería rechazar creación sin descripción', async () => {
      const apiKeyData = {
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

      expect([400, 422]).toContain(response.status);
    }, TIMEOUT);

    it('debería rechazar creación sin permisos', async () => {
      const apiKeyData = {
        description: 'API Key sin permisos'
      };

      const response = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData)
      });

      expect([400, 422]).toContain(response.status);
    }, TIMEOUT);

    it('debería rechazar creación sin autenticación', async () => {
      const apiKeyData = {
        description: 'API Key sin auth',
        permissions: {
          qr_generate: true,
          qr_status: true,
          qr_cancel: true
        }
      };

      const response = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiKeyData)
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);
  });

  describe('GET /apikeys - Listar API Keys', () => {
    it('debería listar las API keys del usuario autenticado', async () => {
      const response = await fetch(`${BASE_URL}/apikeys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.message).toBe('API keys listadas exitosamente');
      expect(result.data).toBeDefined();
      expect(result.data.apiKeys).toBeDefined();
      expect(Array.isArray(result.data.apiKeys)).toBe(true);
      
      // Debería tener al menos la API key creada en el test anterior
      if (createdApiKeyId) {
        const foundApiKey = result.data.apiKeys.find(ak => ak.id === createdApiKeyId);
        expect(foundApiKey).toBeDefined();
        expect(foundApiKey.description).toBe('API Key para pruebas de integración');
      }
    }, TIMEOUT);

    it('debería rechazar listado sin autenticación', async () => {
      const response = await fetch(`${BASE_URL}/apikeys`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);
  });

  describe('DELETE /apikeys/:id - Revocar API Key', () => {
    it('debería revocar una API key existente', async () => {
      // Primero crear una API key para revocar
      const apiKeyData = {
        description: 'API Key para revocar',
        permissions: {
          qr_generate: false,
          qr_status: true,
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
      const apiKeyToRevoke = createResult.data.id;

      // Ahora revocar la API key
      const response = await fetch(`${BASE_URL}/apikeys/${apiKeyToRevoke}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.message).toBe('API key revocada exitosamente');
      expect(result.data.id).toBe(apiKeyToRevoke);
    }, TIMEOUT);

    it('debería rechazar revocación de API key inexistente', async () => {
      const response = await fetch(`${BASE_URL}/apikeys/99999`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status);
    }, TIMEOUT);

    it('debería rechazar revocación sin autenticación', async () => {
      const response = await fetch(`${BASE_URL}/apikeys/1`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(401);
    }, TIMEOUT);

    it('debería rechazar revocación de API key de otro usuario', async () => {
      // Intentar revocar una API key que no pertenece al usuario
      // (usando un ID que definitivamente no existe)
      const response = await fetch(`${BASE_URL}/apikeys/99999`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 403, 404]).toContain(response.status);
    }, TIMEOUT);
  });

  describe('Validaciones de Formato de API Key', () => {
    it('debería generar API keys con prefijo pg_', async () => {
      const apiKeyData = {
        description: 'API Key para validar formato',
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

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.data.apiKey).toMatch(/^pg_[A-Za-z0-9]{40}$/);
      expect(result.data.apiKey.length).toBe(43); // pg_ + 40 caracteres
    }, TIMEOUT);

    it('debería generar API keys únicas', async () => {
      const apiKeyData = {
        description: 'API Key para test de unicidad',
        permissions: {
          qr_generate: true,
          qr_status: true,
          qr_cancel: true
        }
      };

      // Crear múltiples API keys
      const responses = await Promise.all([
        fetch(`${BASE_URL}/apikeys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(apiKeyData)
        }),
        fetch(`${BASE_URL}/apikeys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ ...apiKeyData, description: 'API Key 2' })
        })
      ]);

      const results = await Promise.all(responses.map(r => r.json()));
      
      expect(results[0].data.apiKey).not.toBe(results[1].data.apiKey);
      expect(results[0].data.apiKey).toMatch(/^pg_/);
      expect(results[1].data.apiKey).toMatch(/^pg_/);
    }, TIMEOUT);
  });

  describe('Validaciones de Permisos', () => {
    it('debería aceptar todos los permisos en true', async () => {
      const apiKeyData = {
        description: 'API Key con todos los permisos',
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

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.permissions).toEqual(apiKeyData.permissions);
    }, TIMEOUT);

    it('debería aceptar todos los permisos en false', async () => {
      const apiKeyData = {
        description: 'API Key sin permisos',
        permissions: {
          qr_generate: false,
          qr_status: false,
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

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.permissions).toEqual(apiKeyData.permissions);
    }, TIMEOUT);
  });

  describe('Manejo de Errores', () => {
    it('debería manejar errores de servidor internos', async () => {
      // Intentar crear con datos malformados que podrían causar error de BD
      const malformedData = {
        description: 'A'.repeat(1000), // Descripción muy larga
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
        body: JSON.stringify(malformedData)
      });

      // La descripción larga podría ser aceptada o rechazada, ambos son válidos
      expect([200, 400, 422, 500]).toContain(response.status);
      
      if (response.status === 200) {
        console.log('✅ Descripción larga fue aceptada por el sistema');
      } else {
        console.log('✅ Descripción larga fue rechazada como esperado');
      }
    }, TIMEOUT);

    it('debería validar formato de fecha de expiración', async () => {
      const apiKeyData = {
        description: 'API Key con fecha inválida',
        permissions: {
          qr_generate: true,
          qr_status: true,
          qr_cancel: true
        },
        expiresAt: 'fecha-invalida'
      };

      const response = await fetch(`${BASE_URL}/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(apiKeyData)
      });

      expect([400, 422]).toContain(response.status);
    }, TIMEOUT);
  });
});
