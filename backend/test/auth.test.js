/**
 * Pruebas de autenticación
 */
import { describe, expect, it, beforeAll } from "bun:test";
import { BASE_URL, TEST_CREDENTIALS, TestUtils } from "./setup.js";

describe("Autenticación", () => {
  let authToken;

  beforeAll(async () => {
    // Limpiar datos antes de todas las pruebas
    TestUtils.clearTestData();
  });

  it("debería devolver un token y cuentas al hacer login con credenciales correctas", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("user");
    expect(result.data).toHaveProperty("accessToken");
    expect(result.data.user).toHaveProperty("email");
    expect(result.data.user.email).toBe(TEST_CREDENTIALS.email);
    
    // Verificar que el usuario tiene cuentas
    expect(result.data.user).toHaveProperty("accounts");
    expect(Array.isArray(result.data.user.accounts)).toBe(true);
    expect(result.data.user.accounts.length).toBeGreaterThan(0);
    
    // Verificar estructura de la primera cuenta
    const firstAccount = result.data.user.accounts[0];
    expect(firstAccount).toHaveProperty("id");
    expect(firstAccount).toHaveProperty("accountNumber");
    expect(firstAccount).toHaveProperty("accountType");
    expect(firstAccount).toHaveProperty("currency");
    expect(firstAccount).toHaveProperty("balance");
    expect(firstAccount).toHaveProperty("availableBalance");
    expect(firstAccount).toHaveProperty("status");
    expect(firstAccount).toHaveProperty("isPrimary");
    
    // Verificar que la cuenta está activa
    expect(firstAccount.status).toBe("active");
    expect(firstAccount.currency).toBe("BOB");
    
    // Guardar el token para las demás pruebas
    authToken = result.data.accessToken;
    expect(authToken).toBeTruthy();
  });

  it("debería rechazar el login con credenciales incorrectas", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TEST_CREDENTIALS.email,
        password: "contraseña_incorrecta",
      }),
    });

    // Comprobar que no se autoriza
    expect(response.status).not.toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  it("debería rechazar el login con email inválido", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "email_invalido",
        password: TEST_CREDENTIALS.password,
      }),
    });

    expect(response.status).not.toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  it("debería rechazar el login sin credenciales", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).not.toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  it("debería validar el formato del token JWT", async () => {
    // Primero hacer login para obtener un token
    const loginResponse = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    expect(loginResponse.status).toBe(200);
    const loginResult = await loginResponse.json();
    
    const token = loginResult.data.accessToken;
    
    // Verificar que el token tiene el formato correcto (3 partes separadas por puntos)
    const tokenParts = token.split('.');
    expect(tokenParts).toHaveLength(3);
    
    // Verificar que cada parte es una cadena válida
    tokenParts.forEach(part => {
      expect(part).toBeTruthy();
      expect(typeof part).toBe('string');
    });
  });

  it("debería retornar cuentas con información financiera válida", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    
    const accounts = result.data.user.accounts;
    expect(accounts.length).toBeGreaterThan(0);
    
    // Verificar que cada cuenta tiene información financiera válida
    accounts.forEach(account => {
      // Verificar que el balance es un número válido
      expect(typeof account.balance).toBe('string');
      expect(parseFloat(account.balance)).toBeGreaterThanOrEqual(0);
      
      // Verificar que el balance disponible es un número válido
      expect(typeof account.availableBalance).toBe('string');
      expect(parseFloat(account.availableBalance)).toBeGreaterThanOrEqual(0);
      
      // Verificar que el balance disponible no excede el balance total
      expect(parseFloat(account.availableBalance)).toBeLessThanOrEqual(parseFloat(account.balance));
      
      // Verificar que el tipo de cuenta es válido
      expect(['current', 'savings', 'business']).toContain(account.accountType);
      
      // Verificar que el estado es válido
      expect(['active', 'suspended', 'closed']).toContain(account.status);
    });
  });
});
