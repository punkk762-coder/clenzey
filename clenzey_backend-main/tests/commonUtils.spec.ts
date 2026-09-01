import { describe, expect, it, vi } from "vitest";

import {
  formattedErrorDetails,
  generateReferralCode,
  sendResponse,
  tryCatchUtil,
} from "../src/utilities/commonUtils.ts";
import { mockNext, mockRequest, mockResponse } from "./helpers/mockExpress.ts";

describe("generateReferralCode function", () => {
  it("should generate 8 digit random alpha numeric string.", () => {
    expect(generateReferralCode()).length(8);
  });
});

describe("formattedErrorDetails", () => {
  it("joins zod-style paths into field names", () => {
    expect(
      formattedErrorDetails([
        { message: "Required", path: ["body", "phone"] },
        { message: "Invalid", path: ["query", "page"] },
      ]),
    ).toEqual([
      { field: "body.phone", message: "Required" },
      { field: "query.page", message: "Invalid" },
    ]);
  });
});

describe("tryCatchUtil", () => {
  it("forwards errors to next", async () => {
    const error = new Error("boom");
    const handler = tryCatchUtil(async () => {
      throw error;
    });
    const next = mockNext();
    await handler(mockRequest(), mockResponse(), next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it("runs the handler when no error occurs", async () => {
    const fn = vi.fn();
    const handler = tryCatchUtil(fn);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();
    await handler(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });
});

describe("sendResponse", () => {
  it("wraps successful payloads", () => {
    const res = mockResponse();
    sendResponse(res, { data: { id: 1 }, message: "ok", statusCode: 200 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { id: 1 },
      message: "ok",
      success: true,
    });
  });

  it("wraps error payloads", () => {
    const res = mockResponse();
    sendResponse(res, {
      error: { code: "BAD_REQUEST_ERROR" },
      message: "bad",
      statusCode: 400,
    });
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "BAD_REQUEST_ERROR" },
      message: "bad",
      success: false,
    });
  });
});
