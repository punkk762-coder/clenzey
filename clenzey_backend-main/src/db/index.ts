import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import logger from "../configs/loggerConfig.ts";
import { envConfig } from "../configs/environmentConfig.ts";

const pool = new Pool({
  connectionString: envConfig.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: envConfig.DB_POOL_MAX,
});

const TRANSIENT_POOL_ERRORS = [
  "terminating connection due to administrator command",
  "Connection terminated unexpectedly",
  "ECONNRESET",
  "ENOTFOUND db",
];

pool.on("error", (err) => {
  const isTransient = TRANSIENT_POOL_ERRORS.some((message) =>
    err.message.includes(message),
  );

  if (isTransient) {
    logger.warning("Database pool connection lost; will reconnect on next query", {
      error: err.message,
    });
    return;
  }

  logger.error("Unexpected database pool error", { error: err.message });
});

const db = drizzle({ client: pool });

export const pingDatabase = async (): Promise<boolean> => {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
};

export { pool };
export default db;
