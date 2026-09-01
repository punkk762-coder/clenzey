import type { Application } from "express";
import request, { type Response, type Test } from "supertest";

import { createServer } from "../../../src/server.ts";

let app: Application | null = null;

export const getApp = (): Application => {
  if (!app) {
    app = createServer();
  }
  return app;
};

export const api = (): Test => request(getApp());

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export const authHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

export const parseBody = (res: Response): Record<string, unknown> => {
  const body = res.body as { data?: Record<string, unknown> };
  return body.data ?? (body as Record<string, unknown>);
};

export const loginConsumer = async (
  identifier: string,
  password: string,
): Promise<AuthTokens> => {
  const res = await api()
    .post("/api/v1/consumers/auth/signin")
    .send({ identifier, password })
    .expect(200);

  const data = parseBody(res);
  return {
    accessToken: data.accessToken as string,
    refreshToken: data.refreshToken as string | undefined,
  };
};

export const loginPartner = async (
  identifier: string,
  password: string,
): Promise<AuthTokens> => {
  const res = await api()
    .post("/api/v1/partners/auth/signin")
    .send({ identifier, password })
    .expect(200);

  const data = parseBody(res);
  return {
    accessToken: data.accessToken as string,
    refreshToken: data.refreshToken as string | undefined,
  };
};

export const loginAdmin = async (
  username: string,
  password: string,
): Promise<AuthTokens> => {
  const res = await api()
    .post("/api/v1/admin/auth/login")
    .send({ username, password })
    .expect(200);

  const data = parseBody(res);
  return { accessToken: data.accessToken as string };
};
