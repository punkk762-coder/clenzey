import http from "node:http";

import { envConfig } from "./src/configs/environmentConfig.ts";
import logger from "./src/configs/loggerConfig.ts";
import { closeRedis } from "./src/configs/redisConfig.ts";
import { pool } from "./src/db/index.ts";
import { initSocketIO, closeSocketIO } from "./src/realtime/socketServer.ts";
import { createServer } from "./src/server.ts";
import { waitForDependencies } from "./src/utilities/waitForDependencies.ts";
import { sweepStaleOnlinePartners } from "./src/api/v1/partners/operationalStatus.ts";
import { CronJob } from "cron";
import { APP_TIMEZONE } from "./src/utilities/timezoneUtils.ts";

const SHUTDOWN_TIMEOUT_MS = 30_000;
let staleOnlineCron: CronJob | null = null;

const shutdown = async (
  httpServer: http.Server,
  signal: string,
): Promise<void> => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  await closeSocketIO();
  staleOnlineCron?.stop();
  staleOnlineCron = null;
  await pool.end().catch((err: Error) => {
    logger.error("Error closing database pool", { error: err.message });
  });
  await closeRedis();

  clearTimeout(forceExitTimer);
  logger.info("Graceful shutdown complete");
  process.exit(0);
};

const startServer = async (): Promise<void> => {
  console.log("[STARTUP] Waiting for dependencies...");
  await waitForDependencies();
  console.log("[STARTUP] Dependencies verified, creating server...");

  const app = createServer();
  const httpServer = http.createServer(app);
  httpServer.headersTimeout = 65_000;
  httpServer.requestTimeout = 60_000;

  initSocketIO(httpServer);

  staleOnlineCron = CronJob.from({
    cronTime: "* * * * *",
    onTick: () => {
      void sweepStaleOnlinePartners().catch((err: Error) => {
        logger.error("Stale online partner sweep failed", { error: err.message });
      });
    },
    start: true,
    timeZone: APP_TIMEZONE,
  });

  httpServer.listen(envConfig.PORT, "0.0.0.0", () => {
    logger.info(
      `Server is running on ${envConfig.PORT} in ${envConfig.NODE_ENV} environment (0.0.0.0)`,
    );
  });

  process.on("SIGTERM", () => {
    void shutdown(httpServer, "SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown(httpServer, "SIGINT");
  });
};

startServer().catch((error: unknown) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
