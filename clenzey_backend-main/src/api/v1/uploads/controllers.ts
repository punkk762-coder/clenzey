import type { RequestHandler } from "express";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as uploadsService from "./service.ts";
import type { PresignUploadBody } from "./validations.ts";

export const presignUpload: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  const userType = req.user?.userType;
  if (!userId || !userType) throw new UnauthorizedError();

  const body = req.body as PresignUploadBody;

  const result = await uploadsService.presignUpload({
    ...body,
    userId,
    userType,
  });

  return sendResponse(res, { data: result });
});
