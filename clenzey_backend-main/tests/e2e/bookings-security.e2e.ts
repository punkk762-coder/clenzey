import { describe, expect, it } from "vitest";

import {
  ADMIN,
  ADMIN_PASSWORD,
  BOOKINGS,
  CONSUMER,
  FINANCE_ADMIN,
  OPS_ADMIN,
  OTHER_CONSUMER,
  PARTNER,
  PASSWORD,
  SUPPORT_ADMIN,
} from "./fixtures/seedConstants.ts";
import {
  api,
  authHeader,
  loginAdmin,
  loginConsumer,
  loginPartner,
} from "./helpers/apiClient.ts";

describe("E2E: Booking IDOR protection", () => {
  it("denies consumer access to another consumer booking", async () => {
    const { accessToken } = await loginConsumer(OTHER_CONSUMER.email, PASSWORD);

    await api()
      .get(`/api/v1/bookings/${BOOKINGS.assigned}`)
      .set(authHeader(accessToken))
      .expect(401);
  });

  it("allows booking owner to read their booking", async () => {
    const { accessToken } = await loginConsumer(CONSUMER.email, PASSWORD);

    const res = await api()
      .get(`/api/v1/bookings/${BOOKINGS.assigned}`)
      .set(authHeader(accessToken))
      .expect(200);

    expect(res.body.data.booking).toMatchObject({ id: BOOKINGS.assigned });
  });

  it("allows assigned partner to read booking", async () => {
    const { accessToken } = await loginPartner(PARTNER.email, PASSWORD);

    await api()
      .get(`/api/v1/bookings/${BOOKINGS.assigned}`)
      .set(authHeader(accessToken))
      .expect(200);
  });

  it("allows admin to read any booking", async () => {
    const { accessToken } = await loginAdmin(ADMIN.username, ADMIN_PASSWORD);

    await api()
      .get(`/api/v1/bookings/${BOOKINGS.assigned}`)
      .set(authHeader(accessToken))
      .expect(200);
  });

  it("denies consumer access to another consumer booking photos", async () => {
    const { accessToken } = await loginConsumer(OTHER_CONSUMER.email, PASSWORD);

    await api()
      .get(`/api/v1/bookings/${BOOKINGS.assigned}/photos`)
      .set(authHeader(accessToken))
      .expect(401);
  });

  it("denies consumer access to partner contact on foreign booking", async () => {
    const { accessToken } = await loginConsumer(OTHER_CONSUMER.email, PASSWORD);

    await api()
      .get(`/api/v1/bookings/${BOOKINGS.assigned}/contact/partner`)
      .set(authHeader(accessToken))
      .expect(403);
  });
});

describe("E2E: Admin RBAC", () => {
  it("finance admin cannot access dispatch endpoints", async () => {
    const { accessToken } = await loginAdmin(
      FINANCE_ADMIN.username,
      ADMIN_PASSWORD,
    );

    await api()
      .get("/api/v1/admin/dispatch/jobs/failed")
      .set(authHeader(accessToken))
      .expect(403);
  });

  it("operations admin cannot access finance payroll runs", async () => {
    const { accessToken } = await loginAdmin(OPS_ADMIN.username, ADMIN_PASSWORD);

    await api()
      .get("/api/v1/admin/payroll/runs")
      .set(authHeader(accessToken))
      .expect(403);
  });

  it("support admin cannot assign partner zones", async () => {
    const { accessToken } = await loginAdmin(
      SUPPORT_ADMIN.username,
      ADMIN_PASSWORD,
    );

    await api()
      .get(`/api/v1/admin/partners/${PARTNER.userId}/zones`)
      .set(authHeader(accessToken))
      .expect(403);
  });

  it("operations admin can access dispatch failed jobs", async () => {
    const { accessToken } = await loginAdmin(OPS_ADMIN.username, ADMIN_PASSWORD);

    await api()
      .get("/api/v1/admin/dispatch/jobs/failed")
      .set(authHeader(accessToken))
      .expect(200);
  });

  it("finance admin can access payroll runs", async () => {
    const { accessToken } = await loginAdmin(
      FINANCE_ADMIN.username,
      ADMIN_PASSWORD,
    );

    await api()
      .get("/api/v1/admin/payroll/runs")
      .set(authHeader(accessToken))
      .expect(200);
  });

  it("super admin can access both dispatch and payroll", async () => {
    const { accessToken } = await loginAdmin(ADMIN.username, ADMIN_PASSWORD);

    await api()
      .get("/api/v1/admin/dispatch/jobs/failed")
      .set(authHeader(accessToken))
      .expect(200);

    await api()
      .get("/api/v1/admin/payroll/runs")
      .set(authHeader(accessToken))
      .expect(200);
  });
});

describe("E2E: Consumer address isolation", () => {
  const PRIYA_ADDRESS_ID = "a1000001-0001-4001-8001-000000000001";

  it("consumer cannot read another consumer address by ID", async () => {
    const { accessToken } = await loginConsumer(OTHER_CONSUMER.email, PASSWORD);

    await api()
      .get(`/api/v1/addresses/${PRIYA_ADDRESS_ID}`)
      .set(authHeader(accessToken))
      .expect(404);
  });
});
