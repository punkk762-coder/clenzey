import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/e2e/globalSetup.ts"],
    setupFiles: ["./tests/e2e/setup.ts"],
    include: ["tests/e2e/**/*.e2e.ts"],
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://clenzey:clenzey_secret@localhost:5432/clenzey",
      ENABLE_RATE_LIMIT: "false",
      ENABLE_SWAGGER: "false",
      INTERNAL_API_KEY: "test-internal-api-key-32-chars-min!!",
      JWT_SECRET: "test_jwt_secret_minimum_32_characters_long",
      NODE_ENV: "dev",
      RAZORPAY_WEBHOOK_SECRET: "test_webhook_secret_for_e2e_tests",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    },
  },
});
