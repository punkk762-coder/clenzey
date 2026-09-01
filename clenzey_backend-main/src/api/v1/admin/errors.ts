import { HttpStatusCode } from "axios";

import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export class ExpiredOtpError extends AppError {
  constructor(details = "An OTP is valid only for 10 minutes. Try again!") {
    super("Expired OTP", {
      error: { code: ErrorCode.EXPIRED_RESOURCE, details },
      statusCode: HttpStatusCode.Gone,
    });
  }
}

export class InvalidOtpError extends AppError {
  constructor(
    details = "The OTP you provided is incorrect. Please check it and try again.",
  ) {
    super("Incorrect OTP", {
      error: { code: ErrorCode.INVALID_RESOURCE, details },
      statusCode: HttpStatusCode.Unauthorized,
    });
  }
}

export class UnusedOtpError extends AppError {
  constructor(
    details = "An OTP has already been sent. Check your selected communication channel.",
  ) {
    super("An OTP has already been sent", {
      error: { code: ErrorCode.UNUSED_RESOURCE, details },
      statusCode: HttpStatusCode.Unused,
    });
  }
}
