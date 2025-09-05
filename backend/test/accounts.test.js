/**
 * Pruebas de cuentas bancarias
 */
import { describe, expect, it, beforeAll } from "bun:test";
import { BASE_URL, TEST_CREDENTIALS, TestUtils } from "./setup.js";

describe("Cuentas Bancarias", () => {
  let authToken;
  let userId;
  let accountId;

  beforeAll(async () => {
    // Obtener token de autenticación
    authToken = await TestUtils.getFreshAuthToken("accounts-test");
    
    // Obtener información del usuario
    const loginResponse = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    const loginResult = await loginResponse.json();
    userId = loginResult.data.user.id;
    accountId = loginResult.data.user.accounts[0].id;
  });

  it("debería obtener todas las cuentas del usuario autenticado", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    
    // Verificar estructura de la primera cuenta
    const firstAccount = result.data[0];
    expect(firstAccount).toHaveProperty("id");
    expect(firstAccount).toHaveProperty("accountNumber");
    expect(firstAccount).toHaveProperty("accountType");
    expect(firstAccount).toHaveProperty("currency");
    expect(firstAccount).toHaveProperty("balance");
    expect(firstAccount).toHaveProperty("availableBalance");
    expect(firstAccount).toHaveProperty("status");
  });

  it("debería obtener una cuenta específica por ID", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts/${accountId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.id).toBe(accountId);
    expect(result.data).toHaveProperty("accountNumber");
    expect(result.data).toHaveProperty("accountType");
    expect(result.data).toHaveProperty("balance");
  });

  it("debería obtener el balance de una cuenta específica", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts/${accountId}/balance`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data).toHaveProperty("balance");
    expect(result.data).toHaveProperty("availableBalance");
    
    // Verificar que los balances son números válidos
    expect(typeof result.data.balance).toBe('string');
    expect(parseFloat(result.data.balance)).toBeGreaterThanOrEqual(0);
    expect(typeof result.data.availableBalance).toBe('string');
    expect(parseFloat(result.data.availableBalance)).toBeGreaterThanOrEqual(0);
  });

  it("debería obtener los movimientos de una cuenta", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts/${accountId}/movements`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    
    // Verificar paginación
    expect(result.pagination).toBeDefined();
    expect(result.pagination).toHaveProperty("page");
    expect(result.pagination).toHaveProperty("limit");
    expect(result.pagination).toHaveProperty("total");
  });

  it("debería rechazar acceso a cuentas sin autenticación", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(401);
  });

  it("debería rechazar acceso a cuentas con token inválido", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer token_invalido",
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(401);
  });

  it("debería rechazar acceso a cuentas de otros usuarios", async () => {
    // Intentar acceder a una cuenta que no existe
    const fakeAccountId = 99999;
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts/${fakeAccountId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(404);
  });
});
