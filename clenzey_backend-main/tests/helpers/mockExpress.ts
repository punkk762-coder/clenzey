import type { NextFunction, Request, Response } from "express";
import { vi } from "vitest";

export const mockRequest = (
  overrides: Partial<Request> & {
    body?: Record<string, unknown>;
    cookies?: Record<string, string>;
    headers?: Record<string, string | string[] | undefined>;
    user?: Request["user"];
  } = {},
): Request => {
  const headers = overrides.headers ?? {};
  const req = {
    body: {},
    cookies: {},
    headers,
    header(name: string) {
      const value = headers[name.toLowerCase()] ?? headers[name];
      return typeof value === "string" ? value : undefined;
    },
    ip: "127.0.0.1",
    originalUrl: "/test",
    ...overrides,
  };
  return req as Request;
};

export const mockResponse = (): Response => {
  const res = {
    clearCookie: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    headersSent: false,
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
};

export const mockNext = (): NextFunction => vi.fn() as NextFunction;
