import { HttpStatusCode } from "axios";
import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAuth } from "../configs/firebaseConfig.ts";
import { AppError, RequestValidationError, UnauthorizedError } from "../errors/appErrors.ts";
import ErrorCode from "../errors/errorCode.ts";
import ErrorMsg from "../errors/errorMsg.ts";
import { phoneNumberValidator } from "../validations/customValidator.ts";

export type FirebasePhoneAuthResult = {
  firebaseUid: string;
  phone: string;
};

const isPhoneSignIn = (decoded: DecodedIdToken): boolean => {
  const signInProvider = decoded.firebase?.sign_in_provider;
  if (signInProvider === "phone") {
    return true;
  }

  const phoneIdentities = decoded.firebase?.identities?.phone;
  return Array.isArray(phoneIdentities) && phoneIdentities.length > 0;
};

const assertIndianMobilePhone = (phone: string): void => {
  if (!phoneNumberValidator(phone)) {
    throw new RequestValidationError([
      {
        message: "Phone number must be a valid Indian mobile number.",
        path: ["phone"],
      },
    ]);
  }
};

export const verifyFirebaseIdToken = async (
  idToken: string,
): Promise<FirebasePhoneAuthResult> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new AppError("Firebase authentication is not configured.", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.ServiceUnavailable,
    });
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (code === "auth/id-token-expired") {
      throw new UnauthorizedError(ErrorMsg.SESSION_EXPIRED);
    }

    if (
      code === "auth/invalid-id-token" ||
      code === "auth/argument-error" ||
      code === "auth/id-token-revoked"
    ) {
      throw new UnauthorizedError("Invalid authentication token.");
    }

    throw new AppError("Failed to verify Firebase token.", {
      error: {
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
        details: error instanceof Error ? error.message : String(error),
      },
      statusCode: HttpStatusCode.BadGateway,
    });
  }

  if (!isPhoneSignIn(decoded)) {
    throw new UnauthorizedError("Authentication must use phone sign-in.");
  }

  const phone = decoded.phone_number;
  if (!phone) {
    throw new UnauthorizedError("Firebase token is missing a phone number.");
  }

  assertIndianMobilePhone(phone);

  return {
    firebaseUid: decoded.uid,
    phone,
  };
};
