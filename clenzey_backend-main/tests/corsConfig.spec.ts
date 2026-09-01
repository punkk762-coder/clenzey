import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("isAllowedCorsOrigin with default dev config", () => {
  it("allows requests with no origin header", async () => {
    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(isAllowedCorsOrigin(undefined)).toBe(true);
  });

  it("allows default localhost dev origins", async () => {
    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(isAllowedCorsOrigin("http://localhost:4000")).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:5173")).toBe(true);
  });

  it("allows ngrok tunnel origins in dev", async () => {
    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(
      isAllowedCorsOrigin("https://togate-unorderly-bell.ngrok-free.dev"),
    ).toBe(true);
  });

  it("rejects unknown origins", async () => {
    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(isAllowedCorsOrigin("https://evil.example.com")).toBe(false);
  });

  it("normalizes trailing slashes before matching", async () => {
    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(isAllowedCorsOrigin("http://localhost:4000/")).toBe(true);
  });
});

describe("isAllowedCorsOrigin with mocked env config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("../src/configs/environmentConfig.ts");
    vi.resetModules();
  });

  it("allows origins listed in CORS_ORIGINS", async () => {
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: {
        CORS_ORIGINS: ["https://app.example.com"],
        NODE_ENV: "prod",
        SOCKET_CORS_ORIGINS: [],
      },
    }));

    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(isAllowedCorsOrigin("https://app.example.com")).toBe(true);
    expect(isAllowedCorsOrigin("https://other.example.com")).toBe(false);
  });

  it("allows origins listed in SOCKET_CORS_ORIGINS", async () => {
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: {
        CORS_ORIGINS: [],
        NODE_ENV: "prod",
        SOCKET_CORS_ORIGINS: ["https://socket.example.com"],
      },
    }));

    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(isAllowedCorsOrigin("https://socket.example.com")).toBe(true);
  });

  it("does not allow dev tunnel origins in production", async () => {
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: {
        CORS_ORIGINS: [],
        NODE_ENV: "prod",
        SOCKET_CORS_ORIGINS: [],
      },
    }));

    const { isAllowedCorsOrigin } = await import("../src/configs/corsConfig.ts");
    expect(
      isAllowedCorsOrigin("https://togate-unorderly-bell.ngrok-free.dev"),
    ).toBe(false);
  });
});
