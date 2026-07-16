import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { apiKeyService, generateApiKey } from '../../src/api-keys/apikey.service.js';
import { query } from '../../src/shared/database/pool.js';
import { nextSnowflake } from '../../src/shared/snowflake.js';
import { TestUtils } from '../setup.js';

describe('API Key Service Unit Tests', () => {
  let testAccountId;
  let testApiKeyId;
  let testApiKey;

  beforeAll(async () => {
    const bcRes = await query(`SELECT id FROM bank_credentials LIMIT 1`)
    const bcId = bcRes.rows[0]?.id ?? null
    const accountResult = await query(`
      INSERT INTO accounts (id, account_number, account_type, currency, balance, available_balance, bank_credential_id)
      VALUES ($1, $2, 'current', 'BOB', 0.00, 0.00, $3)
      RETURNING id
    `, [nextSnowflake(), 'TEST-ACCOUNT-001', bcId]);
    testAccountId = accountResult.rows[0].id;
  }, 10000);

  afterAll(async () => {
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
      const keyPart = apiKey.substring(3);
      expect(keyPart).toMatch(/^[A-Za-z0-9]+$/);
      expect(keyPart.length).toBe(40);
    });
  });

  describe('generate method', () => {
    it('debería crear una API key exitosamente', async () => {
      const permissions = { qr_generate: true, qr_status: true, qr_cancel: false };

      const result = await apiKeyService.generate(
        testAccountId, 'API Key de prueba', permissions
      );

      expect(result.apiKey).toMatch(/^pg_/);
      expect(result.description).toBe('API Key de prueba');
      expect(result.permissions).toEqual(permissions);
      expect(result.accountId).toBe(testAccountId);
      expect(result.status).toBe('active');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      testApiKeyId = result.id;
      testApiKey = result.apiKey;
    });

    it('debería crear API key con fecha de expiración', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const permissions = { qr_generate: false, qr_status: true, qr_cancel: true };

      const result = await apiKeyService.generate(
        testAccountId, 'API Key con expiración', permissions, expiresAt
      );

      expect(result.apiKey).toMatch(/^pg_/);
    });
  });

  describe('verifyApiKey method', () => {
    beforeEach(async () => {
      const result = await apiKeyService.generate(
        testAccountId, 'API Key para verificar',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );
      testApiKey = result.apiKey;
    });

    it('debería verificar API key válida', async () => {
      const verification = await apiKeyService.verifyApiKey(testApiKey);
      expect(verification.isValid).toBe(true);
      expect(verification.accountId).toBe(testAccountId);
      expect(verification.permissions).toEqual({
        qr_generate: true, qr_status: true, qr_cancel: true
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

  describe('list method', () => {
    beforeEach(async () => {
      await apiKeyService.generate(
        testAccountId, 'API Key 1',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );
      await apiKeyService.generate(
        testAccountId, 'API Key 2',
        { qr_generate: false, qr_status: true, qr_cancel: false }
      );
    });

    it('debería listar API keys de la cuenta', async () => {
      const result = await apiKeyService.list(testAccountId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);

      result.forEach(apiKey => {
        expect(apiKey.apiKey).toMatch(/^pg_/);
        expect(apiKey.id).toBeDefined();
        expect(apiKey.description).toBeDefined();
        expect(apiKey.permissions).toBeDefined();
        expect(apiKey.status).toBe('active');
      });
    });
  });

  describe('revoke method', () => {
    beforeEach(async () => {
      const result = await apiKeyService.generate(
        testAccountId, 'API Key para revocar',
        { qr_generate: true, qr_status: true, qr_cancel: true }
      );
      testApiKeyId = result.id;
      testApiKey = result.apiKey;
    });

    it('debería revocar API key existente', async () => {
      await apiKeyService.revoke(testApiKeyId);

      const verification = await apiKeyService.verifyApiKey(testApiKey);
      expect(verification.isValid).toBe(false);
    });

    it('debería rechazar revocación de API key inexistente', async () => {
      try {
        await apiKeyService.revoke(99999n);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e.message).toMatch(/no encontrada/i);
      }
    });
  });
});
