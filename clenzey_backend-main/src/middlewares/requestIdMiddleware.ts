import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.length > 0
      ? incoming
      : randomUUID();

  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};

export default requestIdMiddleware;
