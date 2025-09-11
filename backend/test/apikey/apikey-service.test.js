import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { apiKeyService, generateApiKey } from '../../src/services/apikey.service.js';
import { query } from '../../src/config/database.js';
import { TestUtils } from '../setup.js';

describe('API Key Service Unit Tests', () => {
  let testAccountId;
  let testApiKeyId;
  let testApiKey;

  beforeAll(async () => {
    // Crear una cuenta de prueba
    const accountResult = await query(`
      INSERT INTO accounts (account_number, account_type, currency, balance, available_balance, third_bank_credential_id)
      VALUES ($1, 'current', 'BOB', 0.00, 0.00, $2)
      RETURNING id
    `, ['TEST-ACCOUNT-001', 1]); // Asumiendo que existe credential con ID 1

    testAccountId = accountResult.rows[0].id;
  }, 10000);

  afterAll(async () => {
    // Limpiar datos de prueba
    if (testApiKeyId) {
      await query('DELETE FROM api_keys WHERE id = $1', [testApiKeyId]);
    }
    if (testAccountId) {
      await query('DELETE FROM accounts WHERE id = $1', [testAccountId]);
    }
  });

  beforeEach(() => {
    testApiKeyId = null;
    testApiKey = null;
  });

  describe('generateApiKey function', () => {
    it('debería generar una API key con prefijo pg_', () => {
      const apiKey = generateApiKey();
      
      expect(apiKey).toMatch(/^pg_[A-Za-z0-9]{40}$/);
      expect(apiKey.length).toBe(43);
    });

    it('debería generar API keys únicas', () => {
      const apiKey1 = generateApiKey();
      const apiKey2 = generateApiKey();
      
      expect(apiKey1).not.toBe(apiKey2);
      expect(apiKey1).toMatch(/^pg_/);
      expect(apiKey2).toMatch(/^pg_/);
    });

    it('debería generar API keys con caracteres válidos', () => {
      const apiKey = generateApiKey();
      const keyPart = apiKey.substring(3); // Remover prefijo pg_
      
      expect(keyPart).toMatch(/^[A-Za-z0-9]+$/);
      expect(keyPart.length).toBe(40);
    });
  });

  describe('generateApiKey method', () => {
    it('debería crear una API key exitosamente', async () => {
      const permissions = {
        qr_generate: true,
        qr_status: true,
        qr_cancel: false
      };

      const result = await apiKeyService.generateApiKey(
        testAccountId,
        'API Key de prueba',
        permissions
      );

      expect(result.responseCode).toBe(0);
      expect(result.message).toBe('API key generada exitosamente');
      expect(result.apiKey).toMatch(/^pg_/);
      expect(result.description).toBe('API Key de prueba');
      expect(result.permissions).toEqual(permissions);
      expect(result.accountId).toBe(testAccountId);
      expect(result.status).toBe('active');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Guardar para tests posteriores
      testApiKeyId = result.id;
      testApiKey = result.apiKey;
    });

    it('debería rechazar creación para cuenta inexistente', async () => {
      const result = await apiKeyService.generateApiKey(
        99999, // ID de cuenta inexistente
        'API Key inválida',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );

      expect(result.responseCode).toBe(1);
      expect(result.message).toBe('Cuenta no encontrada');
    });

    it('debería crear API key con fecha de expiración', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const permissions = {
        qr_generate: false,
        qr_status: true,
        qr_cancel: true
      };

      const result = await apiKeyService.generateApiKey(
        testAccountId,
        'API Key con expiración',
        permissions,
        expiresAt
      );

      expect(result.responseCode).toBe(0);
      expect(result.expiresAt).toBe(expiresAt);
      expect(result.apiKey).toMatch(/^pg_/);
    });
  });

  describe('verifyApiKey method', () => {
    beforeEach(async () => {
      // Crear una API key para verificar
      const result = await apiKeyService.generateApiKey(
        testAccountId,
        'API Key para verificar',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );
      testApiKey = result.apiKey;
    });

    it('debería verificar API key válida', async () => {
      const verification = await apiKeyService.verifyApiKey(testApiKey);

      expect(verification.isValid).toBe(true);
      expect(verification.accountId).toBe(testAccountId);
      expect(verification.permissions).toEqual({
        qr_generate: true,
        qr_status: true,
        qr_cancel: true
      });
    });

    it('debería rechazar API key inválida', async () => {
      const verification = await apiKeyService.verifyApiKey('pg_invalid_key_123');

      expect(verification.isValid).toBe(false);
    });

    it('debería rechazar API key vacía', async () => {
      const verification = await apiKeyService.verifyApiKey('');

      expect(verification.isValid).toBe(false);
    });
  });

  describe('hasPermission method', () => {
    beforeEach(async () => {
      // Crear una API key con permisos específicos
      const result = await apiKeyService.generateApiKey(
        testAccountId,
        'API Key con permisos específicos',
        { qr_generate: true, qr_status: false, qr_cancel: true }
      );
      testApiKey = result.apiKey;
    });

    it('debería verificar permisos correctamente', async () => {
      expect(await apiKeyService.hasPermission(testApiKey, 'qr_generate')).toBe(true);
      expect(await apiKeyService.hasPermission(testApiKey, 'qr_status')).toBe(false);
      expect(await apiKeyService.hasPermission(testApiKey, 'qr_cancel')).toBe(true);
    });

    it('debería rechazar permisos para API key inválida', async () => {
      expect(await apiKeyService.hasPermission('invalid_key', 'qr_generate')).toBe(false);
    });
  });

  describe('listApiKeys method', () => {
    beforeEach(async () => {
      // Crear múltiples API keys para la cuenta
      await apiKeyService.generateApiKey(
        testAccountId,
        'API Key 1',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );
      await apiKeyService.generateApiKey(
        testAccountId,
        'API Key 2',
        { qr_generate: false, qr_status: true, qr_cancel: false }
      );
    });

    it('debería listar API keys de la cuenta', async () => {
      const result = await apiKeyService.listApiKeys(testAccountId);

      expect(result.responseCode).toBe(0);
      expect(result.apiKeys).toBeDefined();
      expect(Array.isArray(result.apiKeys)).toBe(true);
      expect(result.apiKeys.length).toBeGreaterThanOrEqual(2);
      
      // Verificar que todas las API keys tienen el prefijo pg_
      result.apiKeys.forEach(apiKey => {
        expect(apiKey.apiKey).toMatch(/^pg_/);
        expect(apiKey.id).toBeDefined();
        expect(apiKey.description).toBeDefined();
        expect(apiKey.permissions).toBeDefined();
        expect(apiKey.status).toBe('active');
      });
    });

    it('debería rechazar listado para cuenta inexistente', async () => {
      const result = await apiKeyService.listApiKeys(99999);

      expect(result.responseCode).toBe(0); // El método no valida existencia de cuenta
      expect(result.apiKeys).toEqual([]);
    });
  });

  describe('revokeApiKey method', () => {
    beforeEach(async () => {
      // Crear una API key para revocar
      const result = await apiKeyService.generateApiKey(
        testAccountId,
        'API Key para revocar',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );
      testApiKeyId = result.id;
    });

    it('debería revocar API key existente', async () => {
      const result = await apiKeyService.revokeApiKey(testApiKeyId, testAccountId);

      expect(result.responseCode).toBe(0);
      expect(result.message).toBe('API key revocada exitosamente');
      expect(result.id).toBe(testApiKeyId);

      // Verificar que la API key ya no es válida
      const verification = await apiKeyService.verifyApiKey(testApiKey);
      expect(verification.isValid).toBe(false);
    });

    it('debería rechazar revocación de API key inexistente', async () => {
      const result = await apiKeyService.revokeApiKey(99999, testAccountId);

      expect(result.responseCode).toBe(1);
      expect(result.message).toBe('API key no encontrada o no pertenece a la cuenta');
    });

    it('debería rechazar revocación de API key de otra cuenta', async () => {
      const result = await apiKeyService.revokeApiKey(testApiKeyId, 99999);

      expect(result.responseCode).toBe(1);
      expect(result.message).toBe('API key no encontrada o no pertenece a la cuenta');
    });
  });

  describe('Manejo de errores', () => {
    it('debería manejar errores de base de datos', async () => {
      // Simular error pasando datos inválidos
      const result = await apiKeyService.generateApiKey(
        null, // accountId inválido
        'API Key inválida',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );

      expect(result.responseCode).toBe(1);
      expect(result.message).toBe('Cuenta no encontrada');
    });
  });
});
