import axios from "axios";
import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "./errors";

describe("getApiErrorMessage", () => {
  it("extracts nested error.message from API responses", () => {
    const error = Object.assign(new Error("Request failed with status code 400"), {
      isAxiosError: true,
      response: {
        data: {
          success: false,
          error: {
            code: "BAD_REQUEST_ERROR",
            message: "Cannot transition from PAYMENT_PENDING to CONFIRMED",
          },
        },
      },
    });

    expect(
      getApiErrorMessage(error, "Couldn't transition booking"),
    ).toBe("Cannot transition from PAYMENT_PENDING to CONFIRMED");
  });

  it("falls back when no API message is present", () => {
    const error = new Error("Network Error");
    expect(getApiErrorMessage(error, "Something went wrong")).toBe(
      "Network Error",
    );
  });

  it("extracts validation error details from API responses", () => {
    const error = Object.assign(new Error("Request failed with status code 400"), {
      isAxiosError: true,
      response: {
        data: {
          success: false,
          message: "Request validation failed",
          error: {
            code: "REQUEST_VALIDATION_ERROR",
            details: [
              { field: "fromAt", message: "Invalid ISO datetime" },
              { field: "toAt", message: "Invalid ISO datetime" },
            ],
          },
        },
      },
    });

    expect(getApiErrorMessage(error, "Validation failed")).toBe(
      "fromAt: Invalid ISO datetime. toAt: Invalid ISO datetime",
    );
  });

  it("ignores generic axios status messages", () => {
    const error = axios.isAxiosError(
      Object.assign(new Error("Request failed with status code 500"), {
        isAxiosError: true,
        response: { data: {} },
      }),
    )
      ? Object.assign(new Error("Request failed with status code 500"), {
          isAxiosError: true,
          response: { data: {} },
        })
      : new Error("Request failed with status code 500");

    expect(getApiErrorMessage(error, "Server error")).toBe("Server error");
  });
});
