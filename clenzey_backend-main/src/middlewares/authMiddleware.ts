import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../errors/appErrors.ts";
import type { TokenPayload } from "../utilities/authUtils.ts";
import { verifyToken } from "../utilities/authUtils.ts";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const requireAuth = (allowedUserTypes?: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);

    if (!bearerMatch?.[1]) {
      return next(new UnauthorizedError("Missing or invalid authorization header."));
    }

    const token = bearerMatch[1].trim();

    try {
      const payload = await verifyToken(token);

      if (allowedUserTypes && !allowedUserTypes.includes(payload.userType)) {
        return next(new UnauthorizedError("Access denied."));
      }

      req.user = payload;
      return next();
    } catch (err) {
      return next(
        new UnauthorizedError(
          err instanceof Error && err.name === "JWTExpired"
            ? "Session expired, please log in again."
            : "Invalid token.",
        ),
      );
    }
  };
};
