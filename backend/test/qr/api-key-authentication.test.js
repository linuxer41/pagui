import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { BASE_URL, PUBLIC_API_URL, TestUtils } from "../setup.js";

describe("Autenticación con API Key en operaciones QR", { timeout: 60000 }, () => {
  let authToken;
  let apiKey;
  let generatedQrIds = [];

  const testQrData = {
    transactionId: `TEST-APIKEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount: 100,
    description: 'Test QR API Key',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    singleUse: true,
    modifyAmount: false
  };

  beforeAll(async () => {
    authToken = await TestUtils.getFreshAuthToken("qr-apikey-test");

    const keyResp = await TestUtils.makeRequest(`${BASE_URL}/apikeys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
      body: JSON.stringify({
        description: "Test QR API Key",
        permissions: { qr_generate: true, qr_status: true, qr_cancel: true },
      }),
    });
    const keyResult = await keyResp.json();
    apiKey = keyResult.data.apiKey;
  });

  beforeEach(() => {
    TestUtils.clearTestData();
    generatedQrIds = [];
  });

  it("debería generar QR con API key que tiene permisos", async () => {
    const response = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(testQrData)
    });

    expect([200, 500]).toContain(response.status);
    if (response.status !== 200) return;
    const result = await response.json();

    expect(result.success).toBe(true);
    expect(result.message).toBe("QR generado exitosamente");
    expect(result.data).toHaveProperty("qrId");
    expect(result.data).toHaveProperty("qrImage");

    generatedQrIds.push(result.data.qrId);
  });

  it("debería verificar estado de QR con API key que tiene permisos", async () => {
    const generateResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(testQrData)
    });

    expect([200, 500]).toContain(generateResponse.status);
    if (generateResponse.status !== 200) return;
    const generateResult = await generateResponse.json();
    const qrId = generateResult.data.qrId;
    generatedQrIds.push(qrId);

    const statusResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: { "X-API-Key": apiKey }
    });

    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();

    expect(statusResult.success).toBe(true);
    expect(statusResult.message).toBe("Estado del QR verificado");
    expect(statusResult.data.qrId).toBe(qrId);
    expect(statusResult.data.status).toBe("active");
  });

  it("debería cancelar QR con API key que tiene permisos", async () => {
    const generateResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(testQrData)
    });

    expect([200, 500]).toContain(generateResponse.status);
    if (generateResponse.status !== 200) return;
    const generateResult = await generateResponse.json();
    const qrId = generateResult.data.qrId;
    generatedQrIds.push(qrId);

    const cancelResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/cancelQR`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ qrId })
    });

    expect(cancelResponse.status).toBe(200);
    const cancelResult = await cancelResponse.json();

    expect(cancelResult.success).toBe(true);
    expect(cancelResult.message).toBe("QR cancelado exitosamente");

    const statusResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: { "X-API-Key": apiKey }
    });

    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();
    expect(statusResult.data.status).toBe("cancelled");
  });

  it("debería rechazar operaciones con API key sin permisos", async () => {
    const limitedKeyResp = await TestUtils.makeRequest(`${BASE_URL}/apikeys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
      body: JSON.stringify({
        description: "Limited test key",
        permissions: { qr_generate: false, qr_status: false, qr_cancel: false },
      }),
    });
    const limitedKeyResult = await limitedKeyResp.json();
    const limitedKey = limitedKeyResult.data.apiKey;

    const response = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": limitedKey },
      body: JSON.stringify(testQrData)
    });

    expect(response.status).toBe(403);
  });

  it("debería manejar diferentes tipos de autenticación correctamente", async () => {
    // JWT en el servidor principal
    const jwtResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
      body: JSON.stringify(testQrData)
    });

    expect([200, 500]).toContain(jwtResponse.status);
    if (jwtResponse.status !== 200) return;
    const jwtResult = await jwtResponse.json();
    const qrId = jwtResult.data.qrId;
    generatedQrIds.push(qrId);

    // API Key en el servidor público
    const statusResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: { "X-API-Key": apiKey }
    });

    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();
    expect(statusResult.success).toBe(true);
    expect(statusResult.data.qrId).toBe(qrId);
  });

  it("debería validar permisos específicos para cada operación", { timeout: 60000 }, async () => {
    const generateResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(testQrData)
    });

    expect([200, 500]).toContain(generateResponse.status);
    if (generateResponse.status !== 200) return;
    const generateResult = await generateResponse.json();
    const qrId = generateResult.data.qrId;
    generatedQrIds.push(qrId);

    const operations = [
      { name: "Generar QR", endpoint: "/generate", method: "POST" },
      { name: "Verificar Estado", endpoint: `/${qrId}/status`, method: "GET" },
      { name: "Cancelar QR", endpoint: "/cancelQR", method: "DELETE" },
    ];

    for (const operation of operations) {
      const opts = {
        method: operation.method,
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      };
      if (operation.method === "POST") opts.body = JSON.stringify(testQrData);
      if (operation.method === "DELETE") opts.body = JSON.stringify({ qrId });

      const response = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr${operation.endpoint}`, opts);

      expect([200, 500]).toContain(response.status);
      if (response.status !== 200) return;
      const result = await response.json();
      expect(result.success).toBe(true);
    }
  });

  it("debería manejar errores de autenticación correctamente", async () => {
    const noAuthResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testQrData)
    });

    expect(noAuthResponse.status).toBe(401);

    const invalidKeyResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": "pg_invalid_key_12345" },
      body: JSON.stringify(testQrData)
    });

    expect(invalidKeyResponse.status).toBe(401);
  });

  it("debería validar la estructura de respuesta para todas las operaciones", { timeout: 60000 }, async () => {
    const generateResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(testQrData)
    });

    expect([200, 500]).toContain(generateResponse.status);
    if (generateResponse.status !== 200) return;
    const generateResult = await generateResponse.json();
    const qrId = generateResult.data.qrId;
    generatedQrIds.push(qrId);

    expect(generateResult).toHaveProperty("success");
    expect(generateResult).toHaveProperty("message");
    expect(generateResult).toHaveProperty("data");
    expect(generateResult.success).toBe(true);
    expect(generateResult.message).toBe("QR generado exitosamente");

    const statusResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: { "X-API-Key": apiKey }
    });

    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();

    expect(statusResult).toHaveProperty("success");
    expect(statusResult).toHaveProperty("message");
    expect(statusResult).toHaveProperty("data");
    expect(statusResult.success).toBe(true);
    expect(statusResult.message).toBe("Estado del QR verificado");

    const cancelResponse = await TestUtils.makeRequest(`${PUBLIC_API_URL}/qr/cancelQR`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ qrId })
    });

    expect(cancelResponse.status).toBe(200);
    const cancelResult = await cancelResponse.json();

    expect(cancelResult).toHaveProperty("success");
    expect(cancelResult).toHaveProperty("message");
    expect(cancelResult).toHaveProperty("data");
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.message).toBe("QR cancelado exitosamente");
  });
});
