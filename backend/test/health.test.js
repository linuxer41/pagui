import { describe, expect, it } from "bun:test";
import { BASE_URL, TestUtils } from "./setup.js";

describe("Health Check", () => {
  it("el endpoint raíz debería responder 404", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/`);
    expect(response.status).toBe(404);
    const result = await response.json();
    expect(result).toHaveProperty("error");
  });

  it("debería responder en el endpoint de health", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/health`);
    expect(response.status).toBe(200);
    const body = await response.json();
    const result = body.data ?? body;
    expect(result.status).toBe("ok");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("uptime");
    expect(result).toHaveProperty("version");
  });

  it("debería responder en el endpoint de health/api", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/health/api`);
    expect(response.status).toBe(200);
    const body = await response.json();
    const result = body.data ?? body;
    expect(result.status).toBe("ok");
    expect(result).toHaveProperty("database");
    expect(result).toHaveProperty("timestamp");
  });

  it("debería responder con versión 2.0.0 en /health", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/health`);
    const body = await response.json();
    const result = body.data ?? body;
    expect(result.version).toBe("2.0.0");
  });
});
