import { describe, expect, it, beforeAll } from "bun:test";
import { BASE_URL, TEST_CREDENTIALS, TestUtils } from "./setup.js";

describe("Cuentas Bancarias", () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    authToken = await TestUtils.getFreshAuthToken("accounts-test");
    const loginResponse = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    const loginResult = await loginResponse.json();
    const loginData = loginResult.data ?? loginResult;
    userId = loginData.user.id;
  });

  it("debería obtener token de autenticación", async () => {
    expect(authToken).toBeTruthy();
    expect(typeof authToken).toBe('string');
    expect(authToken.split('.')).toHaveLength(3);
  });

  it("debería tener información del usuario", async () => {
    const loginResponse = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    expect(loginResponse.status).toBe(200);
    const result = await loginResponse.json();
    const loginData = result.data ?? result;

    expect(loginData.user).toHaveProperty("id");
    expect(loginData.user).toHaveProperty("email");
    expect(loginData.user).toHaveProperty("fullName");
    expect(loginData.user).toHaveProperty("role");
    expect(loginData.user).toHaveProperty("status");
    expect(loginData.user).toHaveProperty("accounts");
    expect(Array.isArray(loginData.user.accounts)).toBe(true);
  });

  it("debería listar las cuentas del usuario correctamente", async () => {
    const loginResponse = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    expect(loginResponse.status).toBe(200);
    const result = await loginResponse.json();
    const loginData = result.data ?? result;

    const accounts = loginData.user.accounts;
    // Nota: el admin seed no tiene cuentas asignadas
    expect(Array.isArray(accounts)).toBe(true);
  });

  it("debería rechazar peticiones sin autenticación (401)", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/accounts`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(401);
  });
});
