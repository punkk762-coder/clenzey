import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import ErrorCode from "../errors/errorCode.ts";
import ErrorMsg from "../errors/errorMsg.ts";
import { sendResponse } from "../utilities/commonUtils.ts";

const notFound: RequestHandler = (req, res) => {
  return sendResponse(res, {
    error: {
      code: ErrorCode.NOT_FOUND_ERROR,
      details: `No resource found at ${req.originalUrl}`,
    },
    message: ErrorMsg.PAGE_NOT_FOUND,
    statusCode: HttpStatusCode.NotFound,
  });
};

export default notFound;
