import { describe, expect, it } from "vitest";

import { api, parseBody } from "./helpers/apiClient.ts";

describe("E2E: Health endpoints", () => {
  it("GET /health/live returns ok", async () => {
    const res = await api().get("/api/v1/health/live").expect(200);
    const data = parseBody(res);
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeTypeOf("string");
  });

  it("GET /health returns ok (alias)", async () => {
    const res = await api().get("/api/v1/health").expect(200);
    expect(parseBody(res).status).toBe("ok");
  });

  it("GET /health/ready checks database and redis", async () => {
    const res = await api().get("/api/v1/health/ready");
    const data = parseBody(res);

    if (res.status === 200) {
      expect(data.status).toBe("ready");
      expect(data.checks).toMatchObject({ database: "ok", redis: "ok" });
    } else {
      expect(res.status).toBe(503);
      expect(data.status).toBe("unhealthy");
    }
  });
});

describe("E2E: Public catalog", () => {
  it("GET /services lists catalog without auth", async () => {
    const res = await api().get("/api/v1/services").expect(200);
    const data = parseBody(res) as { services: unknown[] };
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);
  });

  it("returns 404 for unknown routes", async () => {
    await api().get("/api/v1/does-not-exist").expect(404);
  });
});
