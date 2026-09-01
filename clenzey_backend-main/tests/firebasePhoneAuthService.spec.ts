import { HttpStatusCode } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetFirebaseAuth, mockVerifyIdToken } = vi.hoisted(() => ({
  mockGetFirebaseAuth: vi.fn(),
  mockVerifyIdToken: vi.fn(),
}));

vi.mock("../src/configs/firebaseConfig.ts", () => ({
  getFirebaseAuth: mockGetFirebaseAuth,
}));

vi.mock("../src/validations/customValidator.ts", () => ({
  phoneNumberValidator: (value: unknown) =>
    typeof value === "string" && value.startsWith("+919"),
}));

import {
  UnauthorizedError,
  RequestValidationError,
} from "../src/errors/appErrors.ts";
import { verifyFirebaseIdToken } from "../src/services/firebasePhoneAuthService.ts";

const validDecodedToken = {
  firebase: {
    identities: { phone: ["+919876543210"] },
    sign_in_provider: "phone",
  },
  phone_number: "+919876543210",
  uid: "firebase-user-123",
};

describe("verifyFirebaseIdToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFirebaseAuth.mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });
  });

  it("returns phone and firebaseUid for a valid phone sign-in token", async () => {
    mockVerifyIdToken.mockResolvedValue(validDecodedToken);

    const result = await verifyFirebaseIdToken("valid-token");

    expect(mockVerifyIdToken).toHaveBeenCalledWith("valid-token", true);
    expect(result).toEqual({
      firebaseUid: "firebase-user-123",
      phone: "+919876543210",
    });
  });

  it("throws 401 when Firebase auth is not configured", async () => {
    mockGetFirebaseAuth.mockReturnValue(null);

    await expect(verifyFirebaseIdToken("token")).rejects.toMatchObject({
      statusCode: HttpStatusCode.ServiceUnavailable,
    });
  });

  it("throws 401 when token is expired", async () => {
    mockVerifyIdToken.mockRejectedValue({ code: "auth/id-token-expired" });

    await expect(verifyFirebaseIdToken("expired-token")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("throws 401 when token is invalid", async () => {
    mockVerifyIdToken.mockRejectedValue({ code: "auth/invalid-id-token" });

    await expect(verifyFirebaseIdToken("bad-token")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("throws 401 when sign-in provider is not phone", async () => {
    mockVerifyIdToken.mockResolvedValue({
      ...validDecodedToken,
      firebase: { sign_in_provider: "google.com" },
    });

    await expect(verifyFirebaseIdToken("google-token")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("throws 401 when phone_number claim is missing", async () => {
    mockVerifyIdToken.mockResolvedValue({
      ...validDecodedToken,
      phone_number: undefined,
    });

    await expect(verifyFirebaseIdToken("no-phone-token")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("throws 422 when phone is not a valid Indian mobile number", async () => {
    mockVerifyIdToken.mockResolvedValue({
      ...validDecodedToken,
      phone_number: "+14155552671",
    });

    await expect(verifyFirebaseIdToken("us-phone-token")).rejects.toBeInstanceOf(
      RequestValidationError,
    );
  });

  it("accepts phone sign-in via firebase identities when provider is absent", async () => {
    mockVerifyIdToken.mockResolvedValue({
      firebase: {
        identities: { phone: ["+919876543210"] },
      },
      phone_number: "+919876543210",
      uid: "firebase-user-456",
    });

    const result = await verifyFirebaseIdToken("identity-phone-token");
    expect(result.phone).toBe("+919876543210");
  });

  it("throws BadGateway for unexpected Firebase verification errors", async () => {
    mockVerifyIdToken.mockRejectedValue({ code: "auth/network-error" });

    await expect(verifyFirebaseIdToken("network-token")).rejects.toMatchObject({
      statusCode: HttpStatusCode.BadGateway,
    });
  });
});
