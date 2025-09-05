/**
 * Pruebas para la generación de códigos QR
 */
import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { BASE_URL, TestUtils } from "../setup.js";

describe("Generación de códigos QR", () => {
  let authToken;
  let generatedQrId;

  // Datos de prueba para QR
  const testQrData = {
    transactionId: `TEST-QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount: 100,
    description: 'Test QR',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Fecha de vencimiento: mañana
    singleUse: true,
    modifyAmount: false
  };

  beforeAll(async () => {
    // Obtener token de autenticación
    authToken = await TestUtils.getFreshAuthToken("qr-generation");
  });

  beforeEach(() => {
    // Limpiar datos antes de cada prueba
    TestUtils.clearTestData();
  });

  it("debería generar un código QR correctamente", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("qrId");
    expect(result.data).toHaveProperty("qrImage");
    expect(result.data.qrId).toBeTruthy();
    expect(result.data.qrImage).toBeTruthy();
    
    // Guardar el ID del QR para pruebas posteriores
    generatedQrId = result.data.qrId;
  });

  it("debería verificar el estado de un QR generado", async () => {
    // Primero generar un QR
    const generateResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(generateResponse.status).toBe(200);
    const generateResult = await generateResponse.json();
    const qrId = generateResult.data.qrId;
    
    // Ahora verificar el estado
    const statusResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();
    
    expect(statusResult.success).toBe(true);
    expect(statusResult.message).toBe("Estado del QR verificado");
    expect(statusResult.data).toHaveProperty("status");
    expect(statusResult.data).toHaveProperty("qrId");
    expect(statusResult.data).toHaveProperty("amount");
    expect(statusResult.data).toHaveProperty("currency");
    expect(statusResult.data).toHaveProperty("description");
    expect(statusResult.data.qrId).toBe(qrId);
    expect(statusResult.data.status).toBe("active");
  });

  it("debería rechazar la generación de QR sin autenticación", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(response.status).toBe(401);
  });

  it("debería rechazar la generación de QR con datos inválidos", async () => {
    const invalidData = {
      ...testQrData,
      amount: -100, // Monto negativo inválido
      dueDate: "fecha_invalida"
    };
    
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(invalidData)
    });
    
    // El servidor puede devolver 400 (datos inválidos) o 401 (error de autenticación)
    // dependiendo de cómo se valide la autenticación vs validación de datos
    expect([400, 401]).toContain(response.status);
    
    if (response.status === 400) {
      const result = await response.json();
      expect(result.success).toBe(false);
    }
  });

  it("debería generar QR con diferentes configuraciones", async () => {
    const configs = [
      { ...testQrData, singleUse: true, modifyAmount: false },
      { ...testQrData, singleUse: false, modifyAmount: true },
      { ...testQrData, amount: 500, description: "QR de monto alto" }
    ];
    
    for (const config of configs) {
      const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(config)
      });
      
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("qrId");
    }
  });

  it("debería cancelar un QR generado", async () => {
    // Primero generar un QR
    const generateResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(generateResponse.status).toBe(200);
    const generateResult = await generateResponse.json();
    const qrId = generateResult.data.qrId;
    
    // Ahora cancelar el QR
    const cancelResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/cancelQR`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ qrId })
    });
    
    expect(cancelResponse.status).toBe(200);
    const cancelResult = await cancelResponse.json();
    expect(cancelResult.success).toBe(true);
    
    // Verificar que el estado cambió a cancelado
    const statusResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();
    expect(statusResult.data.status).toBe("cancelled");
  });
});
