import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { PARTNER } from "./fixtures/seedConstants.ts";
import { api } from "./helpers/apiClient.ts";

const WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET ?? "test_webhook_secret_for_e2e_tests";
const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY ?? "test-internal-api-key-32-chars-min!!";

const signWebhook = (body: string): string =>
  crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

describe("E2E: Razorpay webhook security", () => {
  it("rejects webhook without signature", async () => {
    await api()
      .post("/api/v1/payments/webhooks/razorpay")
      .send({ event: "payment.captured", payload: {} })
      .expect(400);
  });

  it("rejects webhook with invalid signature", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_test" } } },
    });

    await api()
      .post("/api/v1/payments/webhooks/razorpay")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", "deadbeef".repeat(8))
      .send(body)
      .expect(400);
  });

  it("accepts webhook with valid HMAC signature", async () => {
    const body = JSON.stringify({
      event: "payment.authorized",
      payload: {
        payment: {
          entity: {
            id: "pay_e2e_test_authorized",
            order_id: "order_e2e_unknown",
            status: "authorized",
          },
        },
      },
    });

    const res = await api()
      .post("/api/v1/payments/webhooks/razorpay")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", signWebhook(body))
      .send(body)
      .expect(200);

    expect(res.body.data).toMatchObject({ received: true });
  });
});

describe("E2E: Internal API key", () => {
  const period = "2026-01";

  it("rejects internal attendance without API key", async () => {
    await api()
      .put(`/api/v1/internal/partners/${PARTNER.userId}/attendance/${period}`)
      .send({ absentDays: 2 })
      .expect(401);
  });

  it("rejects internal attendance with wrong API key", async () => {
    await api()
      .put(`/api/v1/internal/partners/${PARTNER.userId}/attendance/${period}`)
      .set("x-internal-api-key", "wrong-key-value-that-is-long-enough!!")
      .send({ absentDays: 2 })
      .expect(401);
  });

  it("accepts internal attendance with valid API key", async () => {
    await api()
      .put(`/api/v1/internal/partners/${PARTNER.userId}/attendance/${period}`)
      .set("x-internal-api-key", INTERNAL_API_KEY)
      .send({ absentDays: 2 })
      .expect(200);
  });
});

describe("E2E: HTTP security headers", () => {
  it("returns helmet security headers on API responses", async () => {
    const res = await api().get("/api/v1/health/live").expect(200);

    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects disallowed CORS origin", async () => {
    const res = await api()
      .get("/api/v1/health/live")
      .set("Origin", "https://evil.example.com");

    expect(res.headers["access-control-allow-origin"]).not.toBe(
      "https://evil.example.com",
    );
  });
});

describe("E2E: Request size limits", () => {
  it("rejects oversized JSON body (>1MB)", async () => {
    const largePayload = { data: "x".repeat(1_100_000) };

    await api()
      .post("/api/v1/consumers/auth/signin")
      .send(largePayload)
      .expect(413);
  });
});
