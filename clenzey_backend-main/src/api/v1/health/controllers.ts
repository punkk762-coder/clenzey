import type { Request, Response } from "express";

import { HttpStatusCode } from "axios";

import { pingRedis } from "../../../configs/redisConfig.ts";
import { pingDatabase } from "../../../db/index.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";

export const healthLive = tryCatchUtil(async (_req: Request, res: Response) => {
  return sendResponse(res, {
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

export const healthReady = tryCatchUtil(async (_req: Request, res: Response) => {
  const [dbOk, redisOk] = await Promise.all([pingDatabase(), pingRedis()]);

  if (!dbOk || !redisOk) {
    return sendResponse(res, {
      data: {
        checks: {
          database: dbOk ? "ok" : "error",
          redis: redisOk ? "ok" : "error",
        },
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
      statusCode: HttpStatusCode.ServiceUnavailable,
    });
  }

  return sendResponse(res, {
    data: {
      checks: {
        database: "ok",
        redis: "ok",
      },
      status: "ready",
      timestamp: new Date().toISOString(),
    },
  });
});
