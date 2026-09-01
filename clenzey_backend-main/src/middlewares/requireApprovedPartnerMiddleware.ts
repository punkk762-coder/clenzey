import type { NextFunction, Request, Response } from "express";

import { ForbiddenError, UnauthorizedError } from "../errors/appErrors.ts";
import * as partnerRepo from "../api/v1/partners/repository.ts";

export const requireApprovedPartner = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const partnerId = req.user?.sub;
  if (!partnerId) {
    return next(new UnauthorizedError());
  }

  const partner = await partnerRepo.findPartnerById(partnerId);
  if (!partner?.partner) {
    return next(new UnauthorizedError());
  }

  if (partner.partner.approvalStatus !== "APPROVED") {
    return next(
      new ForbiddenError(
        "Partner account is not approved. Please wait for admin approval.",
      ),
    );
  }

  return next();
};

/** Enforces partner approval only when the authenticated user is a PARTNER. */
export const requireApprovedPartnerIfPartner = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (req.user?.userType !== "PARTNER") {
    return next();
  }
  return requireApprovedPartner(req, _res, next);
};
