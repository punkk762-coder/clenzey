import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const requiredEnv = (): Record<string, string> => ({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://clenzey:clenzey_secret@localhost:5432/clenzey",
  ENABLE_RATE_LIMIT: "false",
  ENABLE_SWAGGER: "false",
  INTERNAL_API_KEY:
    process.env.INTERNAL_API_KEY ?? "test-internal-api-key-32-chars-min!!",
  JWT_SECRET:
    process.env.JWT_SECRET ?? "test_jwt_secret_minimum_32_characters_long",
  NODE_ENV: "dev",
  RAZORPAY_WEBHOOK_SECRET:
    process.env.RAZORPAY_WEBHOOK_SECRET ?? "test_webhook_secret_for_e2e_tests",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
});

const waitForPostgres = async (url: string, attempts = 30): Promise<void> => {
  const pool = new Pool({ connectionString: url });
  try {
    for (let i = 0; i < attempts; i += 1) {
      try {
        await pool.query("SELECT 1");
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
    throw new Error("PostgreSQL did not become ready in time.");
  } finally {
    await pool.end();
  }
};

export default async function globalSetup(): Promise<void> {
  const env = requiredEnv();
  Object.assign(process.env, env);

  await waitForPostgres(env.DATABASE_URL);

  execSync("pnpm db:dev:migrate", {
    cwd: rootDir,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  execSync("tsx scripts/seed.ts", {
    cwd: rootDir,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
}
