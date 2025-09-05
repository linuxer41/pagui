/**
 * Pruebas para endpoints de health check
 */
import { describe, expect, it } from "bun:test";
import { BASE_URL, TestUtils } from "./setup.js";

describe("Health Check", () => {
  it("debería responder en el endpoint raíz", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/`);
    
    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result).toHaveProperty("status");
    expect(result.status).toBe("online");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("auth_provider");
    expect(result.auth_provider).toBe("zitadel");
  });

  it("debería responder en el endpoint de health", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/health`);
    
    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.message).toBe("Servidor funcionando correctamente");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("uptime");
    expect(result).toHaveProperty("environment");
  });

  it("debería responder en el endpoint de health/api", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/health/api`);
    
    expect(response.status).toBe(200);
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.message).toBe("API funcionando correctamente");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("version");
    expect(result.version).toBe("1.0.0");
  });
});
