import { describe, expect, it, beforeAll } from "bun:test";
import { BASE_URL, TestUtils } from "../setup.js";

describe("Notificación de Pago", () => {
  beforeAll(async () => {
    await TestUtils.getFreshAuthToken("payment-notification");
  });

  it("debería rechazar notificación sin datos requeridos (422)", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/baneco/notifyPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(422);
  });

  it("debería rechazar notificación con QR ID inválido (404)", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/baneco/notifyPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrId: "no-existe",
        transactionId: "TST-001",
        amount: 100,
      }),
    });
    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toBeTruthy();
  });

  it("debería rechazar notificación con qrId faltante", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/baneco/notifyPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: "TST-002",
        amount: 100,
      }),
    });
    expect(response.status).toBe(422);
  });
});
