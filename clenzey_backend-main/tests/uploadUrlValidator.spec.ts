import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("isAllowedUploadUrl with default dev config", () => {
  it("allows any URL when allowlist is empty", async () => {
    const { isAllowedUploadUrl } = await import(
      "../src/validations/uploadUrlValidator.ts"
    );
    expect(isAllowedUploadUrl("https://any-cdn.example.com/file.jpg")).toBe(
      true,
    );
  });
});

describe("isAllowedUploadUrl with mocked env config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("../src/configs/environmentConfig.ts");
    vi.resetModules();
  });

  it("allows URLs whose origin is in the allowlist", async () => {
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: {
        ALLOWED_UPLOAD_URL_ORIGINS: ["https://cdn.example.com"],
      },
    }));

    const { isAllowedUploadUrl } = await import(
      "../src/validations/uploadUrlValidator.ts"
    );
    expect(isAllowedUploadUrl("https://cdn.example.com/path/file.jpg")).toBe(
      true,
    );
    expect(isAllowedUploadUrl("https://other.example.com/file.jpg")).toBe(
      false,
    );
  });

  it("rejects malformed URLs when an allowlist is configured", async () => {
    vi.doMock("../src/configs/environmentConfig.ts", () => ({
      envConfig: {
        ALLOWED_UPLOAD_URL_ORIGINS: ["https://cdn.example.com"],
      },
    }));

    const { isAllowedUploadUrl } = await import(
      "../src/validations/uploadUrlValidator.ts"
    );
    expect(isAllowedUploadUrl("not-a-url")).toBe(false);
  });
});
