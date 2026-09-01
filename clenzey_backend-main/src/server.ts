import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type Application } from "express";
import helmet from "helmet";

import v1 from "./api/v1/index.ts";
import { isAllowedCorsOrigin } from "./configs/corsConfig.ts";
import { envConfig } from "./configs/environmentConfig.ts";
import errorHandler from "./middlewares/errorHandlerMiddleware.ts";
import notFound from "./middlewares/pageNotFoundMiddleware.ts";
import { apiReqestlimiter } from "./middlewares/rateLimiterMiddleware.ts";
import requestIdMiddleware from "./middlewares/requestIdMiddleware.ts";
import requestLogger from "./middlewares/reqLoggerMiddleware.ts";

export const createServer = (): Application => {
  const app = express();
  app.set("trust proxy", envConfig.TRUST_PROXY);
  app
    .disable("x-powered-by")
    .use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        strictTransportSecurity:
          envConfig.NODE_ENV === "prod"
            ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
            : false,
        xPoweredBy: false,
      }),
    )
    .use(
      cors({
        origin(origin, callback) {
          if (!origin || isAllowedCorsOrigin(origin)) {
            callback(null, origin ?? true);
            return;
          }
          callback(null, false);
        },
        credentials: true,
      }),
    )
    .use(apiReqestlimiter)
    .use(
      express.json({
        limit: "1mb",
        verify: (req, _res, buf) => {
          (req as unknown as { rawBody: Buffer }).rawBody = buf;
        },
      }),
    )
    .use(express.urlencoded({ extended: true, limit: "1mb" }))
    .use(cookieParser())
    .use(requestIdMiddleware)
    .use(requestLogger)
    .use(compression());

  app.use("/api/v1", v1);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};
