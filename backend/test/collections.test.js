import { describe, expect, it, beforeAll } from "bun:test";
import { BASE_URL, TestUtils } from "./setup.js";

describe("Collections — Companies", () => {
  it("debería listar empresas activas en GET /companies", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/companies`);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("debería devolver 404 para empresa inexistente", async () => {
    const response = await TestUtils.makeRequest(`${BASE_URL}/companies/no-existe`);
    expect(response.status).toBe(404);
  });
});
