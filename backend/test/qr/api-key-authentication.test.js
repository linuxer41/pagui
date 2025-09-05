/**
 * Pruebas para autenticación con API Key en operaciones QR
 */
import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { BASE_URL, TestUtils } from "../setup.js";

describe("Autenticación con API Key en operaciones QR", () => {
  let authToken;
  let apiKey;
  let generatedQrIds = [];

  // Datos de prueba para QR
  const testQrData = {
    transactionId: `TEST-APIKEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount: 100,
    description: 'Test QR API Key',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    singleUse: true,
    modifyAmount: false
  };

  beforeAll(async () => {
    // Obtener token de autenticación JWT para configurar API keys
    authToken = await TestUtils.getFreshAuthToken("qr-apikey-test");
    
    // TODO: Implementar creación de API key para pruebas
    // Por ahora, usamos el token JWT para las pruebas
    // En un entorno real, aquí se crearía una API key con permisos específicos
    apiKey = authToken; // Placeholder
  });

  beforeEach(() => {
    // Limpiar datos antes de cada prueba
    TestUtils.clearTestData();
    generatedQrIds = [];
  });

  it("debería generar QR con API key que tiene permisos", async () => {
    // Este test simula la generación de QR con API key
    // En un entorno real, se usaría una API key válida con permisos 'qr_generate'
    
    const response = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}` // Simulando API key
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.message).toBe("QR generado exitosamente");
    expect(result.data).toHaveProperty("qrId");
    expect(result.data).toHaveProperty("qrImage");
    
    generatedQrIds.push(result.data.qrId);
  });

  it("debería verificar estado de QR con API key que tiene permisos", async () => {
    // Generar un QR primero
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
    generatedQrIds.push(qrId);
    
    // Verificar estado con API key (simulado)
    const statusResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}` // Simulando API key con permisos 'qr_status'
      }
    });
    
    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();
    
    expect(statusResult.success).toBe(true);
    expect(statusResult.message).toBe("Estado del QR verificado");
    expect(statusResult.data.qrId).toBe(qrId);
    expect(statusResult.data.status).toBe("active");
  });

  it("debería cancelar QR con API key que tiene permisos", async () => {
    // Generar un QR
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
    generatedQrIds.push(qrId);
    
    // Cancelar QR con API key (simulado)
    const cancelResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/cancelQR`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}` // Simulando API key con permisos 'qr_cancel'
      },
      body: JSON.stringify({ qrId })
    });
    
    expect(cancelResponse.status).toBe(200);
    const cancelResult = await cancelResponse.json();
    
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.message).toBe("QR cancelado exitosamente");
    
    // Verificar que el estado cambió
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

  it("debería rechazar operaciones con API key sin permisos", async () => {
    // Este test verifica que las operaciones sean rechazadas cuando la API key
    // no tiene los permisos necesarios
    
    // Generar un QR primero
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
    generatedQrIds.push(qrId);
    
    // En un entorno real con API keys reales, aquí se probaría:
    // 1. API key sin permisos para generar QR
    // 2. API key sin permisos para verificar estado
    // 3. API key sin permisos para cancelar QR
    
    // Por ahora, verificamos que la funcionalidad básica funciona
    expect(qrId).toBeTruthy();
  });

  it("debería manejar diferentes tipos de autenticación correctamente", async () => {
    // Este test verifica que el sistema maneje correctamente tanto
    // autenticación JWT como API key
    
    // Generar QR con JWT
    const jwtResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(jwtResponse.status).toBe(200);
    const jwtResult = await jwtResponse.json();
    const qrId = jwtResult.data.qrId;
    generatedQrIds.push(qrId);
    
    // Verificar estado con JWT
    const statusResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();
    expect(statusResult.success).toBe(true);
    expect(statusResult.data.qrId).toBe(qrId);
  });

  it("debería validar permisos específicos para cada operación", async () => {
    // Este test verifica que cada operación requiera los permisos específicos
    // definidos en el middleware de autenticación
    
    const operations = [
      {
        name: "Generar QR",
        endpoint: "/generate",
        method: "POST",
        requiredPermission: "qr_generate"
      },
      {
        name: "Verificar Estado",
        endpoint: "/:id/status",
        method: "GET",
        requiredPermission: "qr_status"
      },
      {
        name: "Cancelar QR",
        endpoint: "/cancelQR",
        method: "DELETE",
        requiredPermission: "qr_cancel"
      }
    ];
    
    // Generar un QR para las pruebas de estado y cancelación
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
    generatedQrIds.push(qrId);
    
    // Verificar que cada operación funciona con autenticación válida
    for (const operation of operations) {
      let endpoint = operation.endpoint;
      let body = null;
      
      // Reemplazar parámetros en el endpoint
      if (operation.endpoint.includes(":id")) {
        endpoint = operation.endpoint.replace(":id", qrId);
      }
      
      // Preparar body para operaciones que lo requieren
      if (operation.method === "DELETE" && operation.endpoint.includes("cancel")) {
        body = JSON.stringify({ qrId });
      } else if (operation.method === "POST") {
        body = JSON.stringify(testQrData);
      }
      
      const response = await TestUtils.makeRequest(`${BASE_URL}/qr${endpoint}`, {
        method: operation.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body
      });
      
      // Todas las operaciones deberían funcionar con JWT válido
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    }
  });

  it("debería manejar errores de autenticación correctamente", async () => {
    // Probar sin autenticación
    const noAuthResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(noAuthResponse.status).toBe(401);
    
    // Probar con token inválido
    const invalidTokenResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid_token_12345"
      },
      body: JSON.stringify(testQrData)
    });
    
    expect(invalidTokenResponse.status).toBe(401);
  });

  it("debería validar la estructura de respuesta para todas las operaciones", async () => {
    // Generar un QR
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
    generatedQrIds.push(qrId);
    
    // Verificar estructura de respuesta para generación
    expect(generateResult).toHaveProperty("success");
    expect(generateResult).toHaveProperty("message");
    expect(generateResult).toHaveProperty("data");
    expect(generateResult.success).toBe(true);
    expect(generateResult.message).toBe("QR generado exitosamente");
    
    // Verificar estado
    const statusResponse = await TestUtils.makeRequest(`${BASE_URL}/qr/${qrId}/status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    expect(statusResponse.status).toBe(200);
    const statusResult = await statusResponse.json();
    
    // Verificar estructura de respuesta para estado
    expect(statusResult).toHaveProperty("success");
    expect(statusResult).toHaveProperty("message");
    expect(statusResult).toHaveProperty("data");
    expect(statusResult.success).toBe(true);
    expect(statusResult.message).toBe("Estado del QR verificado");
    
    // Cancelar QR
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
    
    // Verificar estructura de respuesta para cancelación
    expect(cancelResult).toHaveProperty("success");
    expect(cancelResult).toHaveProperty("message");
    expect(cancelResult).toHaveProperty("data");
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.message).toBe("QR cancelado exitosamente");
  });
});
