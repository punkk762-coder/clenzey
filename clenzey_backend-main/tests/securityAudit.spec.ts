import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyRazorpayWebhookSignature } from "../src/configs/razorpayConfig.ts";

describe("Security: Razorpay signature verification", () => {
  const secret = "test_webhook_secret_for_security_audit";

  it("rejects tampered payload", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const validSig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    expect(verifyRazorpayWebhookSignature(body, validSig)).toBe(true);
    expect(
      verifyRazorpayWebhookSignature(
        JSON.stringify({ event: "payment.failed" }),
        validSig,
      ),
    ).toBe(false);
  });

  it("rejects malformed signature length without throwing", () => {
    expect(verifyRazorpayWebhookSignature("{}", "tooshort")).toBe(false);
  });
});

describe("Security: Password hashing", () => {
  it("uses bcrypt with sufficient cost factor", async () => {
    const { hashPassword } = await import("../src/utilities/passwordUtils.ts");
    const hash = await hashPassword("Test@1234");
    expect(hash.startsWith("$2b$12$")).toBe(true);
  });
});

describe("Security: Upload URL validation", () => {
  it("allows valid HTTPS URLs when allowlist is empty", async () => {
    const { isAllowedUploadUrl } = await import(
      "../src/validations/uploadUrlValidator.ts"
    );

    expect(isAllowedUploadUrl("https://cdn.example.com/file.jpg")).toBe(true);
  });
});

describe("Security: Log sanitizer", () => {
  it("redacts sensitive fields from log payloads", async () => {
    const { sanitizeLogBody } = await import("../src/utilities/logSanitizer.ts");

    const sanitized = sanitizeLogBody({
      authorization: "Bearer secret-token",
      password: "plain-text",
      nested: { refreshToken: "rt-secret" },
    }) as Record<string, unknown>;

    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.password).toBe("[REDACTED]");
    expect((sanitized.nested as Record<string, string>).refreshToken).toBe(
      "[REDACTED]",
    );
  });
});
