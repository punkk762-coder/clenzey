import { describe, expect, it } from "vitest";

import { sanitizeLogBody } from "../src/utilities/logSanitizer.ts";

describe("sanitizeLogBody", () => {
  it("returns null and undefined unchanged", () => {
    expect(sanitizeLogBody(null)).toBeNull();
    expect(sanitizeLogBody(undefined)).toBeUndefined();
  });

  it("sanitizes arrays recursively", () => {
    const sanitized = sanitizeLogBody([
      { password: "secret" },
      { token: "abc" },
    ]) as Record<string, unknown>[];

    expect(sanitized[0]?.password).toBe("[REDACTED]");
    expect(sanitized[1]?.token).toBe("[REDACTED]");
  });

  it("preserves nested non-sensitive fields", () => {
    const sanitized = sanitizeLogBody({
      user: { name: "Alice", profile: { city: "Bangalore" } },
    }) as { user: { name: string; profile: { city: string } } };

    expect(sanitized.user.name).toBe("Alice");
    expect(sanitized.user.profile.city).toBe("Bangalore");
  });

  it("redacts sensitive fields", () => {
    const sanitized = sanitizeLogBody({
      identifier: "+919876543210",
      password: "secret123",
      otp: "123456",
      token: "verification-token",
    }) as Record<string, unknown>;

    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.otp).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.identifier).toBe("+919876543210");
  });

  it("redacts nested sensitive fields", () => {
    const sanitized = sanitizeLogBody({
      user: { refreshToken: "abc" },
    }) as { user: { refreshToken: string } };

    expect(sanitized.user.refreshToken).toBe("[REDACTED]");
  });
});
