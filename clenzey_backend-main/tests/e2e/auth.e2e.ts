import { describe, expect, it } from "vitest";

import {
  ADMIN,
  ADMIN_PASSWORD,
  CONSUMER,
  OTHER_CONSUMER,
  PARTNER,
  PASSWORD,
} from "./fixtures/seedConstants.ts";
import {
  api,
  authHeader,
  loginAdmin,
  loginConsumer,
  loginPartner,
  parseBody,
} from "./helpers/apiClient.ts";

describe("E2E: Authentication flows", () => {
  it("consumer sign-in returns access token and profile", async () => {
    const res = await api()
      .post("/api/v1/consumers/auth/signin")
      .send({ identifier: CONSUMER.email, password: PASSWORD })
      .expect(200);

    const data = parseBody(res);
    expect(data.accessToken).toBeTypeOf("string");
    expect(data.user).toMatchObject({
      id: CONSUMER.userId,
      phone: CONSUMER.phone,
    });
  });

  it("partner sign-in returns access token", async () => {
    const res = await api()
      .post("/api/v1/partners/auth/signin")
      .send({ identifier: PARTNER.email, password: PASSWORD })
      .expect(200);

    const data = parseBody(res);
    expect(data.accessToken).toBeTypeOf("string");
  });

  it("admin login returns access token with role", async () => {
    const res = await api()
      .post("/api/v1/admin/auth/login")
      .send({ username: ADMIN.username, password: ADMIN_PASSWORD })
      .expect(200);

    const data = parseBody(res);
    expect(data.accessToken).toBeTypeOf("string");
    expect(data.user).toMatchObject({
      role: ADMIN.role,
      username: ADMIN.username,
    });
  });

  it("rejects invalid consumer credentials", async () => {
    await api()
      .post("/api/v1/consumers/auth/signin")
      .send({ identifier: CONSUMER.email, password: "wrong-password" })
      .expect(401);
  });

  it("rejects protected route without token", async () => {
    await api().get("/api/v1/consumers/me").expect(401);
  });

  it("rejects wrong user type on protected route", async () => {
    const { accessToken } = await loginConsumer(CONSUMER.email, PASSWORD);

    await api()
      .get("/api/v1/partners/me")
      .set(authHeader(accessToken))
      .expect(401);
  });

  it("consumer refresh via mobile client rotates tokens", async () => {
    const signIn = await api()
      .post("/api/v1/consumers/auth/signin")
      .set("X-Client-Platform", "ios")
      .send({ identifier: CONSUMER.email, password: PASSWORD })
      .expect(200);

    const signInData = parseBody(signIn);
    expect(signInData.refreshToken).toBeTypeOf("string");

    const refresh = await api()
      .post("/api/v1/consumers/auth/refresh")
      .set("X-Client-Platform", "ios")
      .send({ refreshToken: signInData.refreshToken })
      .expect(200);

    const refreshData = parseBody(refresh);
    expect(refreshData.accessToken).toBeTypeOf("string");
    expect(refreshData.refreshToken).toBeTypeOf("string");
    expect(refreshData.refreshToken).not.toBe(signInData.refreshToken);
  });

  it("admin refresh via cookie returns new access token", async () => {
    const loginRes = await api()
      .post("/api/v1/admin/auth/login")
      .send({ username: ADMIN.username, password: ADMIN_PASSWORD })
      .expect(200);

    const cookies = loginRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const refreshRes = await api()
      .post("/api/v1/admin/auth/refresh")
      .set("Cookie", Array.isArray(cookies) ? cookies : [cookies])
      .expect(200);

    const data = parseBody(refreshRes);
    expect(data.accessToken).toBeTypeOf("string");
  });

  it("rejects expired or tampered JWT", async () => {
    const { accessToken } = await loginConsumer(CONSUMER.email, PASSWORD);
    const [header, payload, signature] = accessToken.split(".");
    const tampered = `${header}.${payload}.${signature.slice(0, -4)}aaaa`;

    await api()
      .get("/api/v1/consumers/me")
      .set(authHeader(tampered))
      .expect(401);
  });

  it("rejects alg-none style unsigned token", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    );
    const payload = Buffer.from(
      JSON.stringify({
        sub: OTHER_CONSUMER.userId,
        userType: "CONSUMER",
        phone: "+919900000000",
      }),
    ).toString("base64url");
    const unsigned = `${header}.${payload}.`;

    await api()
      .get("/api/v1/consumers/me")
      .set(authHeader(unsigned))
      .expect(401);
  });
});

describe("E2E: Auth logout", () => {
  it("consumer logout invalidates refresh session", async () => {
    const signIn = await api()
      .post("/api/v1/consumers/auth/signin")
      .set("X-Client-Platform", "android")
      .send({ identifier: CONSUMER.email, password: PASSWORD })
      .expect(200);

    const { refreshToken } = parseBody(signIn);

    await api()
      .post("/api/v1/consumers/auth/logout")
      .set("X-Client-Platform", "android")
      .send({ refreshToken })
      .expect(200);

    await api()
      .post("/api/v1/consumers/auth/refresh")
      .set("X-Client-Platform", "android")
      .send({ refreshToken })
      .expect(401);
  });
});

describe("E2E: Cross-role token isolation", () => {
  it("partner token cannot access admin KPIs", async () => {
    const { accessToken } = await loginPartner(PARTNER.email, PASSWORD);

    await api()
      .get("/api/v1/admin/kpis")
      .set(authHeader(accessToken))
      .expect(401);
  });

  it("consumer token cannot access admin KPIs", async () => {
    const { accessToken } = await loginConsumer(CONSUMER.email, PASSWORD);

    await api()
      .get("/api/v1/admin/kpis")
      .set(authHeader(accessToken))
      .expect(401);
  });

  it("admin token cannot access consumer profile", async () => {
    const { accessToken } = await loginAdmin(ADMIN.username, ADMIN_PASSWORD);

    await api()
      .get("/api/v1/consumers/me")
      .set(authHeader(accessToken))
      .expect(401);
  });
});
