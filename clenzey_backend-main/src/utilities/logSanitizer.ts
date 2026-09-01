const SENSITIVE_KEYS = new Set([
  "password",
  "otp",
  "secret",
  "token",
  "refreshtoken",
  "accesstoken",
  "authorization",
  "creditcard",
  "cvv",
]);

const REDACTED = "[REDACTED]";

export const sanitizeLogBody = (body: unknown): unknown => {
  if (body === null || body === undefined) return body;
  if (Array.isArray(body)) return body.map(sanitizeLogBody);
  if (typeof body !== "object") return body;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = REDACTED;
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};
