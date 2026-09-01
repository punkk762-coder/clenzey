import type { RequestHandler } from "express";

import logger from "../configs/loggerConfig.ts";
import { sanitizeLogBody } from "../utilities/logSanitizer.ts";

const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  const requestId = req.headers["x-request-id"];

  res.on("finish", () => {
    logger.http({
      durationMs: Date.now() - start,
      method: req.method,
      ...(requestId !== undefined && { requestId }),
      statusCode: res.statusCode,
      url: req.originalUrl,
      ...(Object.keys(req.body ?? {}).length > 0 && {
        body: sanitizeLogBody(req.body),
      }),
    });
  });

  next();
};

export default requestLogger;
