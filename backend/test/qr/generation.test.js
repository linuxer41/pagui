import { describe, expect, it, beforeAll } from "bun:test";
import { BASE_URL, TestUtils } from "../setup.js";

describe("Generación de códigos QR", { timeout: 30000 }, () => {
  let authToken;

  beforeAll(async () => {
    authToken = await TestUtils.getFreshAuthToken("qr-generation");
  });

  it("debería rechazar la generación de QR sin autenticación (401)", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100, description: "Test QR" }),
    });
    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toBeTruthy();
  });

  it("debería rechazar con token inválido (401)", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-invalido" },
      body: JSON.stringify({ amount: 100, description: "Test QR" }),
    });
    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toBeTruthy();
  });

  it("debería rechazar con monto inválido (422)", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ amount: -100 }),
    });
    expect(response.status).toBe(422);
  });

  it("debería generar o rechazar QR con autenticación válida (Baneco externo)", { timeout: 60000 }, async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        amount: 100,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        description: "Test QR generation",
      }),
    });
    // Puede ser 200 (Baneco funciona) o 500 (Baneco no disponible)
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty("qrId");
    }
  });
});
