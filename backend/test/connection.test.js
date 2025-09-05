/**
 * Prueba básica de conexión al servidor
 * Esta prueba verifica que podamos conectarnos al servidor y recibir respuestas
 */
import { describe, expect, it } from "bun:test";
import { BASE_URL, TestUtils } from "./setup.js";

describe("Conexión al servidor", () => {
  it("debería poder conectarse al servidor", async () => {
    try {
      console.log(`Intentando conectar a: ${BASE_URL}`);
      const response = await TestUtils.makeRequest(`${BASE_URL}/health`);
      const status = response.status;
      
      console.log(`Status de respuesta: ${status}`);
      console.log(`Headers:`, response.headers);
      
      const text = await response.text();
      console.log(`Respuesta:`, text);
      
      // Verificar que recibimos algún tipo de respuesta
      expect(status).toBeDefined();
      
    } catch (error) {
      console.error("Error al conectar:", error.message);
      throw error;
    }
  });

  it("debería poder realizar una petición al endpoint de login", async () => {
    try {
      console.log(`Intentando login en: ${BASE_URL}/auth/login`);
      const response = await TestUtils.makeRequest(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "1234",
        }),
      });
      
      const status = response.status;
      console.log(`Status de respuesta login: ${status}`);
      
      const text = await response.text();
      console.log(`Respuesta login:`, text);
      
      // Verificar que recibimos algún tipo de respuesta
      expect(status).toBeDefined();
      
    } catch (error) {
      console.error("Error al hacer login:", error.message);
      throw error;
    }
  });
});
