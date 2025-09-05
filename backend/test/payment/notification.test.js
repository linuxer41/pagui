/**
 * Pruebas unitarias para notificación de pago de QR
 * Estas pruebas verifican el endpoint de notificación de pago en hooks
 */
import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { BASE_URL, TestUtils } from "../setup.js";

describe("Notificación de Pago de QR", () => {
  let authToken;

  beforeAll(async () => {
    // Obtener token de autenticación
    authToken = await TestUtils.getFreshAuthToken('payment-notification');
  });

  beforeEach(() => {
    // Limpiar datos antes de cada prueba
    TestUtils.clearTestData();
  });

  describe("Notificaciones Válidas", () => {
    it("debería procesar una notificación de pago válida", async () => {
      // Primero generar un QR
      const qrResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          transactionId: `TEST-${Date.now()}`,
          amount: 150.50,
          description: "QR para notificación de pago",
          bankId: 1,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          singleUse: true,
          modifyAmount: false
        }),
      });

      expect(qrResponse.status).toBe(200);
      const qrResult = await qrResponse.json();
      const qrId = qrResult.data.qrId;

      // Luego enviar la notificación de pago usando la ruta de hooks
      const notificationData = {
        payment: {
          qrId: qrId,
          transactionId: qrResult.data.transactionId,
          paymentDate: "2024-01-15T00:00:00",
          paymentTime: "14:30:25",
          currency: "USD",
          amount: 150.50,
          senderBankCode: "1016",
          senderName: "CLIENTE TEST",
          senderDocumentId: "12345678",
          senderAccount: "******1234",
          description: "QR para notificación de pago"
        }
      };

      const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.responseCode).toBe(0);
      expect(result.message).toBe("");
    });

    it("debería rechazar una notificación duplicada", async () => {
      // Primero generar un QR
      const qrResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          transactionId: `TEST-DUP-${Date.now()}`,
          amount: 200.00,
          description: "QR para prueba de duplicado",
          bankId: 1,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          singleUse: true,
          modifyAmount: false
        }),
      });

      expect(qrResponse.status).toBe(200);
      const qrResult = await qrResponse.json();
      const qrId = qrResult.data.qrId;

      const notificationData = {
        payment: {
          qrId: qrId,
          transactionId: qrResult.data.transactionId,
          paymentDate: "2024-01-15T00:00:00",
          paymentTime: "14:30:25",
          currency: "USD",
          amount: 200.00,
          senderBankCode: "1016",
          senderName: "CLIENTE TEST",
          senderDocumentId: "12345678",
          senderAccount: "******1234",
          description: "QR para prueba de duplicado"
        }
      };

      // Primera notificación (debería funcionar)
      const firstResponse = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      expect(firstResponse.status).toBe(200);
      const firstResult = await firstResponse.json();
      expect(firstResult.responseCode).toBe(0);

      // Segunda notificación (debería ser rechazada como duplicada)
      const secondResponse = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      expect(secondResponse.status).toBe(400);
      const secondResult = await secondResponse.json();
      expect(secondResult.responseCode).not.toBe(0);
    });
  });

  describe("Validaciones de Datos", () => {
    it("debería rechazar notificación sin datos de pago", async () => {
      const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it("debería rechazar notificación con QR ID inválido", async () => {
      const notificationData = {
        payment: {
          qrId: "qr-id-invalido",
          transactionId: "TEST-123",
          paymentDate: "2024-01-15T00:00:00",
          paymentTime: "14:30:25",
          currency: "USD",
          amount: 100.00,
          senderBankCode: "1016",
          senderName: "CLIENTE TEST",
          senderDocumentId: "12345678",
          senderAccount: "******1234",
          description: "QR con ID inválido"
        }
      };

      const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      expect(response.status).toBe(400);
    });

    it("debería rechazar notificación con monto inválido", async () => {
      // Primero generar un QR
      const qrResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          transactionId: `TEST-AMOUNT-${Date.now()}`,
          amount: 100.00,
          description: "QR para prueba de monto",
          bankId: 1,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          singleUse: true,
          modifyAmount: false
        }),
      });

      expect(qrResponse.status).toBe(200);
      const qrResult = await qrResponse.json();
      const qrId = qrResult.data.qrId;

      const notificationData = {
        payment: {
          qrId: qrId,
          transactionId: qrResult.data.transactionId,
          paymentDate: "2024-01-15T00:00:00",
          paymentTime: "14:30:25",
          currency: "USD",
          amount: 150.00, // Monto diferente al del QR
          senderBankCode: "1016",
          senderName: "CLIENTE TEST",
          senderDocumentId: "12345678",
          senderAccount: "******1234",
          description: "QR para prueba de monto"
        }
      };

      const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Casos de Error", () => {
    it("debería manejar errores de base de datos", async () => {
      const notificationData = {
        payment: {
          qrId: "qr-inexistente",
          transactionId: "TEST-ERROR",
          paymentDate: "2024-01-15T00:00:00",
          paymentTime: "14:30:25",
          currency: "USD",
          amount: 100.00,
          senderBankCode: "1016",
          senderName: "CLIENTE TEST",
          senderDocumentId: "12345678",
          senderAccount: "******1234",
          description: "QR para prueba de error"
        }
      };

      const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.responseCode).not.toBe(0);
    });

    it("debería validar formato de fecha y hora", async () => {
      const notificationData = {
        payment: {
          qrId: "qr-test",
          transactionId: "TEST-DATE",
          paymentDate: "fecha-invalida",
          paymentTime: "hora-invalida",
          currency: "USD",
          amount: 100.00,
          senderBankCode: "1016",
          senderName: "CLIENTE TEST",
          senderDocumentId: "12345678",
          senderAccount: "******1234",
          description: "QR con fecha inválida"
        }
      };

      const response = await TestUtils.makeRequest(`${BASE_URL}/hooks/notifyPaymentQR`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      expect(response.status).toBe(400);
    });
  });
});
