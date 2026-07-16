import { describe, expect, it, beforeAll } from "bun:test";
import { BASE_URL, TEST_CREDENTIALS, TestUtils } from "./setup.js";

describe("Autenticación", () => {
  let authToken;

  beforeAll(async () => {
    TestUtils.clearTestData();
  });

  it("debería devolver un token y usuario al hacer login con credenciales correctas", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    expect(response.status).toBe(200);
    const result = await response.json();

    const data = result.data ?? result
    expect(data).toHaveProperty("user");
    expect(data).toHaveProperty("accessToken");
    expect(data).toHaveProperty("refreshToken");
    expect(data).toHaveProperty("expiresIn");
    expect(data.user).toHaveProperty("email");
    expect(data.user.email).toBe(TEST_CREDENTIALS.email);

    // user tiene array de accounts
    expect(data.user).toHaveProperty("accounts");
    expect(Array.isArray(data.user.accounts)).toBe(true);

    // user tiene estructura completa
    expect(data.user).toHaveProperty("id");
    expect(data.user).toHaveProperty("fullName");
    expect(data.user).toHaveProperty("role");
    expect(data.user).toHaveProperty("status");

    authToken = data.accessToken;
    expect(authToken).toBeTruthy();
  });

  it("debería rechazar el login con credenciales incorrectas", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_CREDENTIALS.email,
        password: "contraseña_incorrecta",
      }),
    });

    expect(response.status).not.toBe(200);
  });

  it("debería validar el formato del token JWT", async () => {
    const loginResponse = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    expect(loginResponse.status).toBe(200);
    const loginResult = await loginResponse.json();

    const loginData = loginResult.data ?? loginResult
    const token = loginData.accessToken;
    const tokenParts = token.split('.');
    expect(tokenParts).toHaveLength(3);
    tokenParts.forEach(part => {
      expect(part).toBeTruthy();
      expect(typeof part).toBe('string');
    });
  });
});
